from sqlalchemy.orm import Session

from ..config import DEFAULT_SETTINGS
from ..models import Setting
from .pricing import Tariff


def get_settings(db: Session) -> dict[str, int]:
    values = dict(DEFAULT_SETTINGS)
    for row in db.query(Setting).all():
        if row.key in values:
            try:
                values[row.key] = int(row.value)
            except ValueError:
                pass
    return values


def update_settings(db: Session, data: dict[str, int]) -> dict[str, int]:
    for key, value in data.items():
        if key not in DEFAULT_SETTINGS:
            continue
        row = db.get(Setting, key)
        if row:
            row.value = str(int(value))
        else:
            db.add(Setting(key=key, value=str(int(value))))
    db.flush()
    return get_settings(db)


def tariff_for(kind: str, settings: dict[str, int]) -> Tariff:
    if kind == "moto":
        return Tariff(settings["hourly_moto_cents"], settings["daily_cap_moto_cents"], settings["grace_minutes"])
    return Tariff(settings["hourly_car_cents"], settings["daily_cap_car_cents"], settings["grace_minutes"])


def public_prices(settings: dict[str, int]) -> dict:
    return {
        "carro": {"hourly_cents": settings["hourly_car_cents"], "daily_cap_cents": settings["daily_cap_car_cents"]},
        "moto": {"hourly_cents": settings["hourly_moto_cents"], "daily_cap_cents": settings["daily_cap_moto_cents"]},
        "grace_minutes": settings["grace_minutes"],
    }
