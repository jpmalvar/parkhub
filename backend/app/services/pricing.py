"""Cálculo de tarifas.

Regras (evolução do programa original, que cobrava por hora iniciada com mínimo de 1h):
  * Tolerância: permanências até `grace_minutes` são gratuitas.
  * Cobrança por hora iniciada (mínimo de 1 hora).
  * Teto diário: cada bloco de 24h nunca custa mais que a diária máxima do tipo de veículo.
"""
import math
from dataclasses import asdict, dataclass
from datetime import datetime


@dataclass(frozen=True)
class Tariff:
    hourly_cents: int
    daily_cap_cents: int
    grace_minutes: int


@dataclass(frozen=True)
class Quote:
    minutes: int
    billed_hours: int
    full_days: int
    gross_cents: int
    amount_cents: int
    grace_applied: bool
    cap_applied: bool
    hourly_cents: int
    daily_cap_cents: int
    grace_minutes: int

    def as_dict(self) -> dict:
        return asdict(self)


def compute_quote(entry: datetime, exit_: datetime, tariff: Tariff) -> Quote:
    seconds = max(0.0, (exit_ - entry).total_seconds())
    minutes = int(seconds // 60)
    base = dict(
        hourly_cents=tariff.hourly_cents,
        daily_cap_cents=tariff.daily_cap_cents,
        grace_minutes=tariff.grace_minutes,
    )

    if seconds <= tariff.grace_minutes * 60:
        return Quote(minutes, 0, 0, 0, 0, True, False, **base)

    hours = max(1, math.ceil(seconds / 3600))
    gross = hours * tariff.hourly_cents
    full_days = 0
    amount = gross
    if tariff.daily_cap_cents > 0:
        full_days, remaining_hours = divmod(hours, 24)
        amount = full_days * tariff.daily_cap_cents + min(remaining_hours * tariff.hourly_cents, tariff.daily_cap_cents)
        amount = min(amount, gross)

    return Quote(minutes, hours, full_days, gross, amount, False, amount < gross, **base)
