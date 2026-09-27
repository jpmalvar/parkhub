from fastapi import Request
from sqlalchemy.orm import Session

from ..config import ON_VERCEL
from ..models import AuditLog, User


def client_ip(request: Request | None) -> str | None:
    if request is None:
        return None
    if ON_VERCEL:
        # A Vercel sobrescreve esse cabeçalho com o IP real do visitante.
        forwarded = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        if forwarded:
            return forwarded[:45]
    return request.client.host if request.client else None


def record(
    db: Session,
    action: str,
    detail: str = "",
    user: User | None = None,
    request: Request | None = None,
    username: str | None = None,
) -> None:
    """Registra uma ação no log de auditoria (o commit fica a cargo de quem chama)."""
    db.add(
        AuditLog(
            user_id=user.id if user else None,
            username=(user.username if user else username),
            action=action,
            detail=detail[:500],
            ip=client_ip(request),
        )
    )
