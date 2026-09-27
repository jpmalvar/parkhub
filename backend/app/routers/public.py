from datetime import datetime, time

from fastapi import APIRouter, Depends
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session, joinedload

from .. import __version__
from ..database import get_db
from ..models import Setting, Ticket, User
from ..services.parking import occupancy
from ..services.settings_service import get_settings, public_prices
from ..utils import LOCAL_TZ, local_to_utc, to_local, utcnow

router = APIRouter(tags=["Público"])


@router.get("/api/health", summary="Verificação de saúde do serviço")
def health():
    return {"status": "ok", "version": __version__, }


@router.get("/api/public/overview", summary="Ocupação atual e tabela de preços")
def overview(db: Session = Depends(get_db)):
    floors = occupancy(db)
    total = sum(f["total"] for f in floors)
    occupied = sum(f["occupied"] for f in floors)
    today_start = local_to_utc(datetime.combine(to_local(utcnow()).date(), time.min))
    entries_today = db.scalar(select(func.count()).select_from(Ticket).where(Ticket.entry_at >= today_start))
    return {
        "floors": floors,
        "total": total,
        "occupied": occupied,
        "free": total - occupied,
        "entries_today": entries_today,
        "prices": public_prices(get_settings(db)),
        "timezone": str(LOCAL_TZ),
    }


@router.get("/api/public/pulse", summary="Marcadores de mudança (o frontend consulta a cada poucos segundos)")
def pulse(db: Session = Depends(get_db)):
    """Substitui o antigo WebSocket, que não roda em função serverless.

    Cada campo muda quando algo daquele tipo muda no banco; o navegador compara com a
    última resposta e só recarrega o que foi alterado.
    """
    last_id, paid = db.execute(
        select(func.coalesce(func.max(Ticket.id), 0), func.count(Ticket.exit_at))
    ).one()
    users = db.execute(
        select(
            func.count(User.id),
            func.coalesce(func.sum(User.token_version), 0),
            func.sum(case((User.is_active, 1), else_=0)),
            func.sum(case((User.role == "admin", 1), else_=0)),
        )
    ).one()
    settings = sorted((k, v) for k, v in db.execute(select(Setting.key, Setting.value)))

    last = None
    newest = db.scalar(select(Ticket).options(joinedload(Ticket.spot)).order_by(Ticket.id.desc()).limit(1))
    left = db.scalar(
        select(Ticket).options(joinedload(Ticket.spot)).where(Ticket.exit_at.is_not(None)).order_by(Ticket.exit_at.desc()).limit(1)
    )
    if left and (newest is None or left.exit_at >= newest.entry_at):
        last = {"action": "exit", "spot": left.spot.code}
    elif newest:
        last = {"action": "entry", "spot": newest.spot.code}

    return {
        "spots": f"{last_id}.{paid}",
        "users": ".".join(str(n or 0) for n in users),
        "settings": ";".join(f"{k}={v}" for k, v in settings),
        "last": last,
    }
