"""Criação da estrutura inicial: tabelas, vagas, tarifas padrão e conta administrativa."""
from sqlalchemy import inspect, select, text
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


# Colunas adicionadas depois que o banco de produção já existia. O create_all não altera
# tabelas existentes, então elas são criadas aqui (sem apagar nenhum dado).
NEW_COLUMNS = {
    "users": {"avatar": "BYTEA", "avatar_updated_at": "TIMESTAMP"},
}
SQLITE_TYPES = {"BYTEA": "BLOB", "TIMESTAMP": "DATETIME"}


def _add_missing_columns() -> None:
    inspector = inspect(engine)
    with engine.begin() as conn:
        for table, columns in NEW_COLUMNS.items():
            existing = {c["name"] for c in inspector.get_columns(table)}
            for name, sql_type in columns.items():
                if name not in existing:
                    if engine.dialect.name == "sqlite":
                        sql_type = SQLITE_TYPES[sql_type]
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {sql_type}"))


def init_db() -> None:
    Base.metadata.create_all(engine)
    _add_missing_columns()
    with SessionLocal() as db:
        ensure_base_data(db)


def bootstrap(with_demo: bool = False) -> None:
    """Prepara o banco ao subir o servidor. Com with_demo=True também gera os dados de demonstração."""
    if engine.dialect.name != "postgresql":
        _prepare(with_demo)
        return
    # Várias instâncias da função podem subir ao mesmo tempo; o lock evita que duas populem o banco juntas.
    with engine.connect() as conn:
        conn.execute(text("SELECT pg_advisory_lock(20261001)"))
        try:
            _prepare(with_demo)
        finally:
            conn.execute(text("SELECT pg_advisory_unlock(20261001)"))
            conn.commit()


def _prepare(with_demo: bool) -> None:
    if with_demo:
        from .demo import populate

        populate()
    else:
        init_db()
