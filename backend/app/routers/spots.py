from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..models import Spot, Ticket, User
from ..security import get_current_user
from ..services import plates
from ..utils import iso

router = APIRouter(prefix="/api/spots", tags=["Vagas"])


@router.get("", summary="Mapa completo da garagem")
def list_spots(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    spots = db.scalars(select(Spot).order_by(Spot.floor, Spot.number)).all()
    active = {
        t.spot_id: t
        for t in db.scalars(select(Ticket).options(joinedload(Ticket.user)).where(Ticket.status == "active")).all()
    }
    floors: dict[int, list] = {}
    for spot in spots:
        ticket = active.get(spot.id)
        mine = bool(ticket and ticket.user_id == user.id)
        item = {
            "id": spot.id,
            "floor": spot.floor,
            "number": spot.number,
            "code": spot.code,
            "kind": spot.kind,
            "occupied": ticket is not None,
            "mine": mine,
            "color_seed": (ticket.id % 8) if ticket else None,
            "ticket": None,
        }
        # Dados do veículo só aparecem para o dono do ticket ou para a administração (privacidade).
        if ticket and (mine or user.is_admin):
            item["ticket"] = {
                "code": ticket.code,
                "plate": ticket.plate,
                "plate_display": plates.display(ticket.plate),
                "vehicle_kind": ticket.vehicle_kind,
                "entry_at": iso(ticket.entry_at),
                "user": {"username": ticket.user.username, "full_name": ticket.user.full_name} if user.is_admin else None,
            }
        floors.setdefault(spot.floor, []).append(item)
    return {"floors": [{"floor": f, "spots": s} for f, s in floors.items()]}
