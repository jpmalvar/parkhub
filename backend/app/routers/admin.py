import csv
import io
import math
from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import Response
from sqlalchemy import case, func, or_, select
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..errors import DomainError
from ..models import AuditLog, Ticket, User
from ..schemas import SettingsIn, UserUpdateIn
from ..security import require_admin
from ..serializers import ticket_dict, user_dict
from ..services import audit, plates
from ..services.parking import METHOD_LABELS, occupancy
from ..services.pdf import report_pdf
from ..services.settings_service import get_settings, update_settings
from ..utils import fmt_duration, fmt_local, iso, local_to_utc, to_local, utcnow

router = APIRouter(prefix="/api/admin", tags=["Administração"], dependencies=[Depends(require_admin)])


# ------------------------------------------------------------------ painel
@router.get("/stats", summary="Indicadores e séries para o dashboard")
def stats(days: int = Query(30, ge=7, le=365), db: Session = Depends(get_db)):
    today = to_local(utcnow()).date()
    start_day = today - timedelta(days=days - 1)
    start_utc = local_to_utc(datetime.combine(start_day, time.min))
    prev_start_utc = local_to_utc(datetime.combine(start_day - timedelta(days=days), time.min))

    paid = db.scalars(select(Ticket).where(Ticket.status == "paid", Ticket.exit_at >= prev_start_utc)).all()

    series = {start_day + timedelta(days=i): {"revenue_cents": 0, "tickets": 0} for i in range(days)}
    by_kind = {"carro": {"revenue_cents": 0, "tickets": 0}, "moto": {"revenue_cents": 0, "tickets": 0}}
    by_method: dict[str, dict] = {}
    revenue = prev_revenue = revenue_today = 0
    stays: list[int] = []
    count = 0
    for t in paid:
        amount = t.amount_cents or 0
        if t.exit_at < start_utc:
            prev_revenue += amount
            continue
        local_day = to_local(t.exit_at).date()
        count += 1
        revenue += amount
        if local_day == today:
            revenue_today += amount
        if local_day in series:
            series[local_day]["revenue_cents"] += amount
            series[local_day]["tickets"] += 1
        by_kind.setdefault(t.vehicle_kind, {"revenue_cents": 0, "tickets": 0})
        by_kind[t.vehicle_kind]["revenue_cents"] += amount
        by_kind[t.vehicle_kind]["tickets"] += 1
        m = by_method.setdefault(t.payment_method or "isento", {"revenue_cents": 0, "tickets": 0})
        m["revenue_cents"] += amount
        m["tickets"] += 1
        stays.append(int((t.exit_at - t.entry_at).total_seconds() // 60))

    hours = [0] * 24
    for entry in db.scalars(select(Ticket.entry_at).where(Ticket.entry_at >= start_utc)).all():
        hours[to_local(entry).hour] += 1

    floors = occupancy(db)
    total_spots = sum(f["total"] for f in floors)
    occupied = sum(f["occupied"] for f in floors)
    customers = db.scalar(select(func.count()).select_from(User).where(User.role == "user"))
    new_customers = db.scalar(
        select(func.count()).select_from(User).where(User.role == "user", User.created_at >= start_utc)
    )

    recent = db.scalars(
        select(AuditLog).where(AuditLog.action.in_(["entrada", "saida"])).order_by(AuditLog.created_at.desc()).limit(8)
    ).all()

    return {
        "days": days,
        "kpis": {
            "revenue_today_cents": revenue_today,
            "revenue_cents": revenue,
            "prev_revenue_cents": prev_revenue,
            "tickets": count,
            "avg_ticket_cents": revenue // count if count else 0,
            "avg_stay_minutes": sum(stays) // len(stays) if stays else 0,
            "occupied": occupied,
            "total_spots": total_spots,
            "occupancy_pct": round(occupied * 100 / total_spots, 1) if total_spots else 0,
            "customers": customers,
            "new_customers": new_customers,
        },
        "revenue_series": [
            {"date": d.isoformat(), "label": d.strftime("%d/%m"), **v} for d, v in series.items()
        ],
        "entries_by_hour": [{"hour": h, "entries": n} for h, n in enumerate(hours)],
        "by_kind": [{"kind": k, **v} for k, v in by_kind.items()],
        "by_method": [
            {"method": k, "label": METHOD_LABELS.get(k, k), **v}
            for k, v in sorted(by_method.items(), key=lambda kv: -kv[1]["tickets"])
        ],
        "floors": floors,
        "recent": [
            {"id": a.id, "action": a.action, "detail": a.detail, "username": a.username, "created_at": iso(a.created_at)}
            for a in recent
        ],
    }


# ------------------------------------------------------------------ relatórios
def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        raise DomainError(422, "Data inválida. Use o formato AAAA-MM-DD.")


def _report_query(status: str, kind: str, q: str, date_from: str | None, date_to: str | None):
    stmt = select(Ticket).join(Ticket.user).options(joinedload(Ticket.spot), joinedload(Ticket.user))
    if status != "all":
        stmt = stmt.where(Ticket.status == status)
    if kind != "all":
        stmt = stmt.where(Ticket.vehicle_kind == kind)
    q = q.strip()
    if q:
        cleaned = plates.clean(q)
        conditions = [User.username.contains(q.lower()), User.full_name.contains(q), Ticket.code == q.lstrip("#")]
        if cleaned:
            conditions.append(Ticket.plate.contains(cleaned))
        stmt = stmt.where(or_(*conditions))
    d_from, d_to = _parse_date(date_from), _parse_date(date_to)
    if d_from:
        stmt = stmt.where(Ticket.entry_at >= local_to_utc(datetime.combine(d_from, time.min)))
    if d_to:
        stmt = stmt.where(Ticket.entry_at < local_to_utc(datetime.combine(d_to + timedelta(days=1), time.min)))
    return stmt


def _summary(db: Session, stmt) -> dict:
    sub = stmt.subquery()
    count = db.scalar(select(func.count()).select_from(sub))
    revenue = db.scalar(select(func.coalesce(func.sum(sub.c.amount_cents), 0)).where(sub.c.status == "paid"))
    paid_count = db.scalar(select(func.count()).select_from(sub).where(sub.c.status == "paid"))
    active = db.scalar(select(func.count()).select_from(sub).where(sub.c.status == "active"))
    return {
        "count": count,
        "revenue_cents": revenue,
        "avg_cents": revenue // paid_count if paid_count else 0,
        "active": active,
    }


ReportFilters = dict(
    status=Query("all", pattern="^(all|active|paid)$"),
    kind=Query("all", pattern="^(all|carro|moto)$"),
    q=Query("", max_length=60),
)


@router.get("/tickets", summary="Relatório de movimentação (paginado)")
def list_tickets(
    status: str = ReportFilters["status"],
    kind: str = ReportFilters["kind"],
    q: str = ReportFilters["q"],
    date_from: str | None = None,
    date_to: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=5, le=100),
    db: Session = Depends(get_db),
):
    stmt = _report_query(status, kind, q, date_from, date_to)
    summary = _summary(db, stmt)
    items = db.scalars(
        stmt.order_by(Ticket.entry_at.desc()).offset((page - 1) * page_size).limit(page_size)
    ).unique().all()
    return {
        "items": [ticket_dict(t, include_user=True) for t in items],
        "page": page,
        "pages": max(1, math.ceil(summary["count"] / page_size)),
        "summary": summary,
    }


def _filters_text(status, kind, q, date_from, date_to) -> str:
    parts = [
        {"all": "todos os status", "active": "somente no pátio", "paid": "somente pagos"}[status],
        {"all": "todos os veículos", "carro": "carros", "moto": "motos"}[kind],
    ]
    if date_from or date_to:
        parts.append(f"período {date_from or 'início'} a {date_to or 'hoje'}")
    if q:
        parts.append(f"busca '{q}'")
    return ", ".join(parts)


@router.get("/tickets/export", summary="Exportar relatório (CSV ou PDF)")
def export_tickets(
    request: Request,
    format: str = Query("csv", pattern="^(csv|pdf)$"),
    status: str = ReportFilters["status"],
    kind: str = ReportFilters["kind"],
    q: str = ReportFilters["q"],
    date_from: str | None = None,
    date_to: str | None = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    stmt = _report_query(status, kind, q, date_from, date_to)
    tickets = db.scalars(stmt.order_by(Ticket.entry_at.desc()).limit(5000)).unique().all()
    stamp = to_local(utcnow()).strftime("%Y%m%d-%H%M")
    audit.record(db, "exportacao", f"Relatório {format.upper()} com {len(tickets)} registros", user=admin, request=request)
    db.commit()

    if format == "pdf":
        content = report_pdf(tickets, _summary(db, stmt), _filters_text(status, kind, q, date_from, date_to))
        return Response(
            content,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="parkhub-relatorio-{stamp}.pdf"'},
        )

    buffer = io.StringIO()
    writer = csv.writer(buffer, delimiter=";")
    writer.writerow(
        ["Ticket", "Placa", "Tipo", "Cliente", "Usuário", "Vaga", "Entrada", "Saída", "Permanência", "Status", "Pagamento", "Detalhe", "Valor (R$)"]
    )
    for t in tickets:
        duration = int(((t.exit_at or utcnow()) - t.entry_at).total_seconds() // 60)
        writer.writerow(
            [
                t.code,
                plates.display(t.plate),
                t.vehicle_kind,
                t.user.full_name,
                t.user.username,
                t.spot.code,
                fmt_local(t.entry_at, "%d/%m/%Y %H:%M:%S"),
                fmt_local(t.exit_at, "%d/%m/%Y %H:%M:%S") if t.exit_at else "",
                fmt_duration(duration),
                "Pago" if t.status == "paid" else "No pátio",
                METHOD_LABELS.get(t.payment_method or "", ""),
                t.payment_detail or "",
                f"{(t.amount_cents or 0) / 100:.2f}".replace(".", ",") if t.amount_cents is not None else "",
            ]
        )
    return Response(
        "﻿" + buffer.getvalue(),  # BOM para o Excel reconhecer acentos
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="parkhub-relatorio-{stamp}.csv"'},
    )


# ------------------------------------------------------------------ busca
@router.get("/search", summary="Buscar veículo por placa, ticket ou cliente")
def search(q: str = Query(..., min_length=2, max_length=40), db: Session = Depends(get_db)):
    cleaned = plates.clean(q)
    conditions = [User.username.contains(q.strip().lower()), User.full_name.contains(q.strip()), Ticket.code == q.strip().lstrip("#")]
    if cleaned:
        conditions.append(Ticket.plate.contains(cleaned))
    base = select(Ticket).join(Ticket.user).options(joinedload(Ticket.spot), joinedload(Ticket.user)).where(or_(*conditions))
    active = db.scalars(base.where(Ticket.status == "active").order_by(Ticket.entry_at.desc()).limit(8)).unique().all()
    history = db.scalars(base.where(Ticket.status == "paid").order_by(Ticket.exit_at.desc()).limit(6)).unique().all()
    return {
        "active": [ticket_dict(t, include_user=True) for t in active],
        "history": [ticket_dict(t, include_user=True) for t in history],
    }


# ------------------------------------------------------------------ tarifas
@router.get("/settings", summary="Tarifas e regras de cobrança")
def read_settings(db: Session = Depends(get_db)):
    return get_settings(db)


@router.put("/settings", summary="Atualizar tarifas")
def write_settings(
    data: SettingsIn,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    before = get_settings(db)
    after = update_settings(db, data.model_dump())
    changes = [
        f"{key}: {before[key]} → {after[key]}" for key in after if before.get(key) != after[key]
    ]
    if changes:
        audit.record(db, "tarifas", "; ".join(changes), user=admin, request=request)
    db.commit()
    return after


# ------------------------------------------------------------------ usuários
@router.get("/users", summary="Listar usuários com métricas")
def list_users(q: str = Query("", max_length=40), db: Session = Depends(get_db)):
    stmt = select(User)
    if q.strip():
        stmt = stmt.where(or_(User.username.contains(q.strip().lower()), User.full_name.contains(q.strip())))
    users = db.scalars(stmt.order_by(User.role, User.created_at.desc())).all()

    metrics = {
        row.user_id: row
        for row in db.execute(
            select(
                Ticket.user_id,
                func.count(Ticket.id).label("tickets"),
                func.coalesce(func.sum(Ticket.amount_cents), 0).label("spent"),
                func.sum(case((Ticket.status == "active", 1), else_=0)).label("active"),
            ).group_by(Ticket.user_id)
        ).all()
    }
    items = []
    for u in users:
        m = metrics.get(u.id)
        items.append(
            {
                **user_dict(u),
                "tickets": m.tickets if m else 0,
                "spent_cents": m.spent if m else 0,
                "active_tickets": (m.active or 0) if m else 0,
            }
        )
    return {"items": items}


@router.patch("/users/{user_id}", summary="Alterar papel ou status de um usuário")
def update_user(
    user_id: int,
    data: UserUpdateIn,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    target = db.get(User, user_id)
    if target is None:
        raise DomainError(404, "Usuário não encontrado.")
    if target.id == admin.id:
        raise DomainError(400, "Você não pode alterar a sua própria conta por aqui.")
    changes = []
    if data.role is not None and data.role != target.role:
        target.role = data.role
        target.token_version += 1  # força novo login com as novas permissões
        changes.append(f"papel → {'administrador' if data.role == 'admin' else 'cliente'}")
    if data.is_active is not None and data.is_active != target.is_active:
        target.is_active = data.is_active
        changes.append("conta reativada" if data.is_active else "conta desativada")
    if changes:
        audit.record(db, "usuario", f"@{target.username}: {', '.join(changes)}", user=admin, request=request)
    db.commit()
    return {"user": user_dict(target)}


# ------------------------------------------------------------------ auditoria
@router.get("/audit", summary="Log de auditoria")
def audit_log(
    action: str = Query("all", max_length=32),
    q: str = Query("", max_length=60),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=5, le=100),
    db: Session = Depends(get_db),
):
    stmt = select(AuditLog)
    if action != "all":
        stmt = stmt.where(AuditLog.action == action)
    if q.strip():
        stmt = stmt.where(or_(AuditLog.username.contains(q.strip().lower()), AuditLog.detail.contains(q.strip())))
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = db.scalars(stmt.order_by(AuditLog.created_at.desc()).offset((page - 1) * page_size).limit(page_size)).all()
    actions = db.scalars(select(AuditLog.action).distinct().order_by(AuditLog.action)).all()
    return {
        "items": [
            {"id": a.id, "created_at": iso(a.created_at), "username": a.username, "action": a.action, "detail": a.detail, "ip": a.ip}
            for a in rows
        ],
        "page": page,
        "pages": max(1, math.ceil(total / page_size)),
        "total": total,
        "actions": actions,
    }
