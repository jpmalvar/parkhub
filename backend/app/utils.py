from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from .config import TIMEZONE

LOCAL_TZ = ZoneInfo(TIMEZONE)


def utcnow() -> datetime:
    """Data/hora atual em UTC (sem tzinfo, como é armazenada no banco)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def to_local(dt: datetime) -> datetime:
    return dt.replace(tzinfo=timezone.utc).astimezone(LOCAL_TZ)


def local_to_utc(dt: datetime) -> datetime:
    return dt.replace(tzinfo=LOCAL_TZ).astimezone(timezone.utc).replace(tzinfo=None)


def iso(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    return dt.replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z")


def brl(cents: int | None) -> str:
    value = (cents or 0) / 100
    formatted = f"{value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return f"R$ {formatted}"


def fmt_local(dt: datetime | None, pattern: str = "%d/%m/%Y %H:%M") -> str:
    return to_local(dt).strftime(pattern) if dt else "—"


def fmt_duration(minutes: int) -> str:
    days, rem = divmod(max(0, minutes), 1440)
    hours, mins = divmod(rem, 60)
    parts = []
    if days:
        parts.append(f"{days}d")
    if hours or days:
        parts.append(f"{hours}h")
    parts.append(f"{mins:02d}min" if (hours or days) else f"{mins}min")
    return " ".join(parts)
