from fastapi import Request
from sqlalchemy.orm import Session

from ..models import AuditLog, User


def client_ip(request: Request | None) -> str | None:
    if request is None or request.client is None:
        return None
    return request.client.host


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
