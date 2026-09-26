from datetime import datetime, time

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import __version__
from ..database import get_db
from ..models import Ticket
from ..services.parking import occupancy
from ..services.realtime import manager
from ..services.settings_service import get_settings, public_prices
from ..utils import LOCAL_TZ, local_to_utc, to_local, utcnow

router = APIRouter(tags=["Público"])


@router.get("/api/health", summary="Verificação de saúde do serviço")
def health():
    return {"status": "ok", "version": __version__, "realtime_clients": manager.count}


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


@router.websocket("/api/ws")
async def realtime(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            message = await websocket.receive_text()
            if message == "ping":
                await websocket.send_text('{"type":"pong"}')
    except WebSocketDisconnect:
        pass
    finally:
        await manager.disconnect(websocket)
