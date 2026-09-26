from datetime import datetime, time, timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, Query, Request
from fastapi.responses import Response
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..errors import DomainError
from ..models import Ticket, User
from ..schemas import LookupIn, ParkIn, PayIn
from ..security import get_current_user, require_customer
from ..serializers import ticket_dict
from ..services import parking, pix, plates
from ..services.pdf import receipt_pdf
from ..services.realtime import manager
from ..services.settings_service import get_settings, tariff_for
from ..utils import local_to_utc, to_local, utcnow

router = APIRouter(prefix="/api/tickets", tags=["Tickets"])


def _tariff_dict(db: Session, kind: str) -> dict:
    t = tariff_for(kind, get_settings(db))
    return {"hourly_cents": t.hourly_cents, "daily_cap_cents": t.daily_cap_cents, "grace_minutes": t.grace_minutes}


@router.post("", status_code=201, summary="Estacionar (gera um ticket)")
def create_ticket(
    data: ParkIn,
    request: Request,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(require_customer),
):
    ticket = parking.park(db, user, data.spot_id, data.plate, data.vehicle_kind, data.save_vehicle, data.nickname, request)
    background.add_task(
        manager.broadcast,
        {"type": "spots", "action": "entry", "spot_id": ticket.spot_id, "message": f"Entrada registrada na vaga {ticket.spot.code}"},
    )
    return {"ticket": ticket_dict(ticket), "tariff": _tariff_dict(db, ticket.vehicle_kind)}


@router.get("/mine", summary="Meus tickets (ativos e histórico)")
def my_tickets(
    status: str = Query("all", pattern="^(all|active|paid)$"),
    q: str = Query("", max_length=12),
    days: int | None = Query(None, ge=1, le=3650),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(Ticket).options(joinedload(Ticket.spot)).where(Ticket.user_id == user.id)
    if status != "all":
        stmt = stmt.where(Ticket.status == status)
    cleaned = plates.clean(q)
    if cleaned:
        stmt = stmt.where(or_(Ticket.plate.contains(cleaned), Ticket.code.contains(cleaned)))
    if days:
        since = local_to_utc(datetime.combine(to_local(utcnow()).date() - timedelta(days=days - 1), time.min))
        stmt = stmt.where(Ticket.entry_at >= since)
    tickets = db.scalars(stmt.order_by(Ticket.entry_at.desc()).limit(500)).all()
    tariffs = {k: _tariff_dict(db, k) for k in ("carro", "moto")}
    return {"items": [ticket_dict(t) for t in tickets], "tariffs": tariffs}


@router.post("/lookup", summary="Localizar ticket pelo número e placa")
def lookup(data: LookupIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    code = data.code.strip().lstrip("#")
    ticket = parking.get_ticket(db, user, code)
    if ticket.plate != plates.clean(data.plate):
        raise DomainError(404, "A placa informada não corresponde a este ticket.")
    return {"ticket": ticket_dict(ticket)}


@router.get("/{code}", summary="Detalhes do ticket com cotação atual")
def ticket_detail(code: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    ticket = parking.get_ticket(db, user, code)
    return {
        "ticket": ticket_dict(ticket, include_user=user.is_admin),
        "quote": parking.quote(db, ticket).as_dict(),
        "tariff": _tariff_dict(db, ticket.vehicle_kind),
    }


@router.get("/{code}/pix", summary="Gerar cobrança Pix (simulada)")
def ticket_pix(code: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    ticket = parking.get_ticket(db, user, code)
    if ticket.status != "active":
        raise DomainError(409, "Este ticket já foi finalizado.")
    q = parking.quote(db, ticket)
    txid = pix.new_txid(ticket.code)
    return {"txid": txid, "amount_cents": q.amount_cents, "payload": pix.build_payload(q.amount_cents, txid)}


@router.post("/{code}/pay", summary="Pagar e liberar a saída")
def pay(
    code: str,
    data: PayIn,
    request: Request,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ticket = parking.get_ticket(db, user, code)
    ticket, extra = parking.checkout(
        db,
        ticket,
        user,
        data.method,
        card=data.card.model_dump() if data.card else None,
        cash_received_cents=data.cash_received_cents,
        pix_txid=data.pix_txid,
        request=request,
    )
    background.add_task(
        manager.broadcast,
        {"type": "spots", "action": "exit", "spot_id": ticket.spot_id, "message": f"Vaga {ticket.spot.code} liberada"},
    )
    return {"ticket": ticket_dict(ticket, include_user=user.is_admin), **extra}


@router.get("/{code}/receipt.pdf", summary="Comprovante em PDF")
def receipt(code: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    ticket = parking.get_ticket(db, user, code)
    if ticket.status != "paid":
        raise DomainError(409, "O comprovante fica disponível após o pagamento.")
    return Response(
        receipt_pdf(ticket),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="comprovante-parkhub-{ticket.code}.pdf"'},
    )
