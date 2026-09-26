"""Criação da estrutura inicial: tabelas, vagas, tarifas padrão e conta administrativa."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import (
    DEFAULT_ADMIN_PASSWORD,
    DEFAULT_ADMIN_USERNAME,
    DEFAULT_SETTINGS,
    FLOORS,
    MOTO_SPOTS_PER_FLOOR,
    SPOTS_PER_FLOOR,
)
from .database import Base, SessionLocal, engine
from .models import Setting, Spot, User
from .security import hash_password


def ensure_base_data(db: Session) -> None:
    if not db.scalar(select(Spot.id).limit(1)):
        for floor in range(1, FLOORS + 1):
            for number in range(1, SPOTS_PER_FLOOR + 1):
                kind = "moto" if number > SPOTS_PER_FLOOR - MOTO_SPOTS_PER_FLOOR else "carro"
                db.add(Spot(floor=floor, number=number, kind=kind))

    for key, value in DEFAULT_SETTINGS.items():
        if db.get(Setting, key) is None:
            db.add(Setting(key=key, value=str(value)))

    if not db.scalar(select(User.id).where(User.role == "admin").limit(1)):
        db.add(
            User(
                username=DEFAULT_ADMIN_USERNAME,
                full_name="Administrador ParkHub",
                password_hash=hash_password(DEFAULT_ADMIN_PASSWORD),
                role="admin",
            )
        )
    db.commit()


def init_db() -> None:
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        ensure_base_data(db)
