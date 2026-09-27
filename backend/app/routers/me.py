import base64
import binascii
from collections import Counter

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload, undefer

from ..database import get_db
from ..models import Ticket, User
from ..schemas import AvatarIn, ProfileIn
from ..security import get_current_user
from ..serializers import user_dict
from ..services import audit
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


# ------------------------------------------------------------------ perfil
MAX_AVATAR_BYTES = 200 * 1024
IMAGE_SIGNATURES = {b"\xff\xd8\xff": "image/jpeg", b"\x89PNG\r\n\x1a\n": "image/png"}


def _image_type(data: bytes) -> str | None:
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return next((mime for sig, mime in IMAGE_SIGNATURES.items() if data.startswith(sig)), None)


@router.patch("/profile", summary="Alterar o próprio nome")
def update_profile(
    data: ProfileIn, request: Request, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    if data.full_name != user.full_name:
        audit.record(db, "perfil", f"Nome: {user.full_name} → {data.full_name}", user=user, request=request)
        user.full_name = data.full_name
        db.commit()
    return {"user": user_dict(user)}


@router.put("/avatar", summary="Enviar foto de perfil")
def upload_avatar(
    data: AvatarIn, request: Request, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    header, _, encoded = data.image.partition(",")
    if not header.startswith("data:image/") or not header.endswith(";base64"):
        raise HTTPException(422, "Formato de imagem inválido.")
    try:
        raw = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(422, "Formato de imagem inválido.") from None
    if len(raw) > MAX_AVATAR_BYTES:
        raise HTTPException(413, "A imagem é grande demais (máximo de 200 KB).")
    if _image_type(raw) is None:
        raise HTTPException(422, "Envie uma imagem JPG, PNG ou WebP.")
    user.avatar = raw
    user.avatar_updated_at = utcnow()
    audit.record(db, "perfil", "Foto de perfil alterada", user=user, request=request)
    db.commit()
    return {"user": user_dict(user)}


@router.delete("/avatar", summary="Remover foto de perfil")
def delete_avatar(request: Request, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.avatar_updated_at:
        user.avatar = None
        user.avatar_updated_at = None
        audit.record(db, "perfil", "Foto de perfil removida", user=user, request=request)
        db.commit()
    return {"user": user_dict(user)}


@router.get("/avatar/{user_id}", summary="Foto de perfil de um usuário", include_in_schema=False)
def get_avatar(user_id: int, db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    target = db.scalar(select(User).options(undefer(User.avatar)).where(User.id == user_id))
    if target is None or not target.avatar:
        raise HTTPException(404, "Foto não encontrada.")
    # A URL muda (?v=...) toda vez que a foto é trocada, então pode ficar em cache.
    return Response(
        target.avatar,
        media_type=_image_type(target.avatar) or "application/octet-stream",
        headers={"Cache-Control": "private, max-age=31536000, immutable"},
    )
