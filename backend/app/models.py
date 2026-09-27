from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    LargeBinary,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import Mapped, deferred, mapped_column, relationship

from .database import Base
from .utils import utcnow


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(24), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(80))
    password_hash: Mapped[str] = mapped_column(String(128))
    role: Mapped[str] = mapped_column(String(10), default="user")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    # Incrementado ao trocar a senha: invalida todas as sessões anteriores.
    token_version: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    # Foto de perfil (imagem pequena, já reduzida no navegador). "deferred" pra não carregar
    # os bytes toda vez que um usuário é lido do banco.
    avatar: Mapped[bytes | None] = deferred(mapped_column(LargeBinary, nullable=True))
    avatar_updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    vehicles: Mapped[list["Vehicle"]] = relationship(back_populates="owner", cascade="all, delete-orphan")

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"


class Vehicle(Base):
    __tablename__ = "vehicles"
    __table_args__ = (UniqueConstraint("user_id", "plate", name="uq_vehicle_user_plate"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    plate: Mapped[str] = mapped_column(String(7))
    kind: Mapped[str] = mapped_column(String(10))
    nickname: Mapped[str | None] = mapped_column(String(40), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    owner: Mapped[User] = relationship(back_populates="vehicles")


class Spot(Base):
    __tablename__ = "spots"
    __table_args__ = (UniqueConstraint("floor", "number", name="uq_spot_floor_number"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    floor: Mapped[int] = mapped_column(Integer)
    number: Mapped[int] = mapped_column(Integer)
    kind: Mapped[str] = mapped_column(String(10), default="carro")

    @property
    def code(self) -> str:
        return f"P{self.floor}-{self.number:02d}"


_ACTIVE = text("status = 'active'")


class Ticket(Base):
    __tablename__ = "tickets"
    __table_args__ = (
        # Garantias no próprio banco: uma vaga e uma placa só podem ter UM ticket ativo.
        Index("uq_active_spot", "spot_id", unique=True, sqlite_where=_ACTIVE, postgresql_where=_ACTIVE),
        Index("uq_active_plate", "plate", unique=True, sqlite_where=_ACTIVE, postgresql_where=_ACTIVE),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str | None] = mapped_column(String(12), unique=True, index=True, nullable=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    plate: Mapped[str] = mapped_column(String(7), index=True)
    vehicle_kind: Mapped[str] = mapped_column(String(10))
    spot_id: Mapped[int] = mapped_column(ForeignKey("spots.id"), index=True)
    entry_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
    exit_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(12), default="active", index=True)
    amount_cents: Mapped[int | None] = mapped_column(Integer, nullable=True)
    billed_hours: Mapped[int | None] = mapped_column(Integer, nullable=True)
    payment_method: Mapped[str | None] = mapped_column(String(12), nullable=True)
    payment_ref: Mapped[str | None] = mapped_column(String(64), nullable=True)
    payment_detail: Mapped[str | None] = mapped_column(String(160), nullable=True)
    closed_by: Mapped[str | None] = mapped_column(String(24), nullable=True)

    user: Mapped[User] = relationship()
    spot: Mapped[Spot] = relationship()


class Setting(Base):
    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(String(40), primary_key=True)
    value: Mapped[str] = mapped_column(String(200))


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    username: Mapped[str | None] = mapped_column(String(24), nullable=True)
    action: Mapped[str] = mapped_column(String(32), index=True)
    detail: Mapped[str] = mapped_column(Text, default="")
    ip: Mapped[str | None] = mapped_column(String(45), nullable=True)
