"""Modelos de entrada (validação dos dados recebidos pela API)."""
import re
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

from .services import plates

VehicleKind = Literal["carro", "moto"]
_USERNAME = re.compile(r"^[a-z0-9_.]{3,24}$")


def _check_password_strength(value: str) -> str:
    if len(value) < 8:
        raise ValueError("A senha deve ter pelo menos 8 caracteres.")
    if len(value.encode("utf-8")) > 72:
        raise ValueError("A senha é longa demais (máximo de 72 bytes).")
    if not re.search(r"[A-Za-z]", value) or not re.search(r"\d", value):
        raise ValueError("A senha deve conter letras e números.")
    return value


class RegisterIn(BaseModel):
    username: str
    full_name: str
    password: str
    confirm_password: str

    @field_validator("username")
    @classmethod
    def _username(cls, v: str) -> str:
        v = v.strip().lower()
        if not _USERNAME.match(v):
            raise ValueError("O usuário deve ter de 3 a 24 caracteres: letras minúsculas, números, '.' ou '_'.")
        return v

    @field_validator("full_name")
    @classmethod
    def _full_name(cls, v: str) -> str:
        v = " ".join(v.split())
        if not 3 <= len(v) <= 80:
            raise ValueError("Informe seu nome completo (3 a 80 caracteres).")
        return v

    @field_validator("password")
    @classmethod
    def _password(cls, v: str) -> str:
        return _check_password_strength(v)

    @model_validator(mode="after")
    def _match(self):
        if self.password != self.confirm_password:
            raise ValueError("As senhas não coincidem.")
        return self


class LoginIn(BaseModel):
    username: str = Field(max_length=64)
    password: str = Field(max_length=128)


class ChangePasswordIn(BaseModel):
    current_password: str = Field(max_length=128)
    new_password: str
    confirm_password: str

    @field_validator("new_password")
    @classmethod
    def _password(cls, v: str) -> str:
        return _check_password_strength(v)

    @model_validator(mode="after")
    def _match(self):
        if self.new_password != self.confirm_password:
            raise ValueError("As senhas não coincidem.")
        return self


class VehicleIn(BaseModel):
    plate: str
    kind: VehicleKind
    nickname: str | None = Field(default=None, max_length=30)

    @field_validator("plate")
    @classmethod
    def _plate(cls, v: str) -> str:
        return plates.normalize(v)

    @field_validator("nickname")
    @classmethod
    def _nick(cls, v: str | None) -> str | None:
        v = (v or "").strip()
        return v or None


class ParkIn(BaseModel):
    spot_id: int
    plate: str = Field(max_length=12)
    vehicle_kind: VehicleKind
    save_vehicle: bool = False
    nickname: str | None = Field(default=None, max_length=30)


class LookupIn(BaseModel):
    code: str = Field(max_length=12)
    plate: str = Field(max_length=12)


class CardIn(BaseModel):
    number: str = Field(max_length=25)
    holder: str = Field(max_length=60)
    expiry: str = Field(max_length=5)
    cvv: str = Field(max_length=4)


class PayIn(BaseModel):
    method: Literal["pix", "cartao", "dinheiro"]
    card: CardIn | None = None
    cash_received_cents: int | None = Field(default=None, ge=0, le=10_000_000)
    pix_txid: str | None = Field(default=None, max_length=25)


class SettingsIn(BaseModel):
    hourly_car_cents: int = Field(ge=50, le=100_000)
    hourly_moto_cents: int = Field(ge=50, le=100_000)
    daily_cap_car_cents: int = Field(ge=0, le=1_000_000)
    daily_cap_moto_cents: int = Field(ge=0, le=1_000_000)
    grace_minutes: int = Field(ge=0, le=120)

    @model_validator(mode="after")
    def _caps(self):
        for cap, hourly, label in (
            (self.daily_cap_car_cents, self.hourly_car_cents, "carros"),
            (self.daily_cap_moto_cents, self.hourly_moto_cents, "motos"),
        ):
            if cap and cap < hourly:
                raise ValueError(f"A diária máxima de {label} não pode ser menor que o valor de uma hora.")
        return self


class UserUpdateIn(BaseModel):
    role: Literal["user", "admin"] | None = None
    is_active: bool | None = None
