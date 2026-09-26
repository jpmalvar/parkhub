from collections import Counter

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..models import Ticket, User
from ..security import get_current_user
from ..utils import to_local, utcnow

router = APIRouter(prefix="/api/me", tags=["Minha conta"])

MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]


@router.get("/summary", summary="Resumo de uso e gastos do cliente")
def summary(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    tickets = db.scalars(select(Ticket).options(joinedload(Ticket.spot)).where(Ticket.user_id == user.id)).all()
    paid = [t for t in tickets if t.status == "paid"]
    total_spent = sum(t.amount_cents or 0 for t in paid)
    total_minutes = sum(int((t.exit_at - t.entry_at).total_seconds() // 60) for t in paid)

    # Gastos dos últimos 6 meses (mês local)
    today = to_local(utcnow()).date()
    months = []
    y, m = today.year, today.month
    for _ in range(6):
        months.append((y, m))
        m -= 1
        if m == 0:
            y, m = y - 1, 12
    months.reverse()
    by_month = {key: 0 for key in months}
    for t in paid:
        d = to_local(t.exit_at)
        if (d.year, d.month) in by_month:
            by_month[(d.year, d.month)] += t.amount_cents or 0

    floors = Counter(t.spot.floor for t in tickets)
    return {
        "total_spent_cents": total_spent,
        "visits": len(paid),
        "active": sum(1 for t in tickets if t.status == "active"),
        "total_minutes": total_minutes,
        "avg_minutes": total_minutes // len(paid) if paid else 0,
        "favorite_floor": floors.most_common(1)[0][0] if floors else None,
        "monthly": [{"label": f"{MONTHS[mm - 1]}/{str(yy)[2:]}", "amount_cents": v} for (yy, mm), v in by_month.items()],
    }
