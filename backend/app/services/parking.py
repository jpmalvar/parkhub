"""Regras centrais do estacionamento: entrada, cotação e saída de veículos."""
import secrets

from fastapi import Request
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from ..config import MAX_ACTIVE_TICKETS_PER_USER
from ..errors import DomainError
from ..models import Spot, Ticket, User, Vehicle
from ..utils import brl, utcnow
from . import audit, cards, pix, plates
from .pricing import Quote, compute_quote
from .settings_service import get_settings, tariff_for

PAYMENT_METHODS = {"pix", "cartao", "dinheiro"}
METHOD_LABELS = {"pix": "Pix", "cartao": "Cartão", "dinheiro": "Dinheiro", "isento": "Isento"}


def park(
    db: Session,
    user: User,
    spot_id: int,
    raw_plate: str,
    kind: str,
    save_vehicle: bool = False,
    nickname: str | None = None,
    request: Request | None = None,
) -> Ticket:
    try:
        plate = plates.normalize(raw_plate)
    except ValueError as exc:
        raise DomainError(422, str(exc))

    spot = db.get(Spot, spot_id)
    if spot is None:
        raise DomainError(404, "Vaga não encontrada.")
    if spot.kind != kind:
        if spot.kind == "moto":
            raise DomainError(422, f"A vaga {spot.code} é exclusiva para motos.")
        raise DomainError(422, "Motos devem utilizar as vagas exclusivas sinalizadas no mapa.")

    active_count = db.scalar(
        select(func.count()).select_from(Ticket).where(Ticket.user_id == user.id, Ticket.status == "active")
    )
    if active_count >= MAX_ACTIVE_TICKETS_PER_USER:
        raise DomainError(
            409,
            f"Você já possui {MAX_ACTIVE_TICKETS_PER_USER} veículos estacionados. Finalize um ticket para continuar.",
        )
    if db.scalar(select(Ticket.id).where(Ticket.spot_id == spot.id, Ticket.status == "active")):
        raise DomainError(409, f"A vaga {spot.code} acabou de ser ocupada. Escolha outra.")
    if db.scalar(select(Ticket.id).where(Ticket.plate == plate, Ticket.status == "active")):
        raise DomainError(409, f"O veículo {plates.display(plate)} já está na garagem.")

    ticket = Ticket(user_id=user.id, plate=plate, vehicle_kind=kind, spot_id=spot.id, entry_at=utcnow())
    db.add(ticket)
    try:
        db.flush()
    except IntegrityError:
        # Outra requisição ocupou a vaga/placa no mesmo instante: o índice único do banco impede duplicidade.
        db.rollback()
        raise DomainError(409, "A vaga ou o veículo acabou de ser registrado por outra operação. Tente novamente.")
    ticket.code = str(1000 + ticket.id)

    if save_vehicle:
        exists = db.scalar(select(Vehicle.id).where(Vehicle.user_id == user.id, Vehicle.plate == plate))
        if not exists:
            db.add(Vehicle(user_id=user.id, plate=plate, kind=kind, nickname=(nickname or None)))

    audit.record(
        db, "entrada", f"Ticket #{ticket.code} · {plates.display(plate)} · vaga {spot.code}", user=user, request=request
    )
    db.commit()
    db.refresh(ticket)
    return ticket


def get_ticket(db: Session, user: User, code: str) -> Ticket:
    ticket = db.scalar(
        select(Ticket).options(joinedload(Ticket.spot), joinedload(Ticket.user)).where(Ticket.code == code)
    )
    if ticket is None or (not user.is_admin and ticket.user_id != user.id):
        raise DomainError(404, "Ticket não encontrado.")
    return ticket


def quote(db: Session, ticket: Ticket) -> Quote:
    end = ticket.exit_at or utcnow()
    return compute_quote(ticket.entry_at, end, tariff_for(ticket.vehicle_kind, get_settings(db)))


def checkout(
    db: Session,
    ticket: Ticket,
    actor: User,
    method: str,
    card: dict | None = None,
    cash_received_cents: int | None = None,
    pix_txid: str | None = None,
    request: Request | None = None,
) -> tuple[Ticket, dict]:
    if ticket.status != "active":
        raise DomainError(409, "Este ticket já foi finalizado.")

    now = utcnow()
    q = compute_quote(ticket.entry_at, now, tariff_for(ticket.vehicle_kind, get_settings(db)))
    extra: dict = {}
    ref: str | None = None

    if q.amount_cents == 0:
        method = "isento"
        detail = "Saída dentro do período de tolerância"
    elif method == "pix":
        ref = pix_txid if pix_txid and pix_txid.isalnum() and len(pix_txid) <= 25 else pix.new_txid(ticket.code)
        detail = "Pix · confirmação instantânea"
    elif method == "cartao":
        if not card:
            raise DomainError(422, "Informe os dados do cartão.")
        try:
            brand, last4 = cards.validate_card(card.get("number", ""), card.get("holder", ""), card.get("expiry", ""), card.get("cvv", ""))
        except ValueError as exc:
            raise DomainError(422, str(exc))
        ref = f"AUT{secrets.randbelow(900000) + 100000}"
        detail = f"{brand} final {last4}"
    elif method == "dinheiro":
        if cash_received_cents is None or cash_received_cents < q.amount_cents:
            raise DomainError(422, f"Valor recebido insuficiente. Total a pagar: {brl(q.amount_cents)}.")
        change = cash_received_cents - q.amount_cents
        extra["change_cents"] = change
        detail = f"Recebido {brl(cash_received_cents)} · troco {brl(change)}"
    else:
        raise DomainError(422, "Forma de pagamento inválida.")

    # Atualização condicional: se dois pagamentos chegarem juntos, apenas um é aceito.
    result = db.execute(
        update(Ticket)
        .where(Ticket.id == ticket.id, Ticket.status == "active")
        .values(
            status="paid",
            exit_at=now,
            amount_cents=q.amount_cents,
            billed_hours=q.billed_hours,
            payment_method=method,
            payment_ref=ref,
            payment_detail=detail,
            closed_by=actor.username,
        )
    )
    if result.rowcount != 1:
        db.rollback()
        raise DomainError(409, "Este ticket já foi finalizado.")

    audit.record(
        db,
        "saida",
        f"Ticket #{ticket.code} · {plates.display(ticket.plate)} · {METHOD_LABELS[method]} · {brl(q.amount_cents)}",
        user=actor,
        request=request,
    )
    db.commit()
    db.refresh(ticket)
    extra["quote"] = q.as_dict()
    return ticket, extra


def occupancy(db: Session) -> list[dict]:
    spots = db.scalars(select(Spot).order_by(Spot.floor, Spot.number)).all()
    occupied_ids = set(db.scalars(select(Ticket.spot_id).where(Ticket.status == "active")).all())
    floors: dict[int, dict] = {}
    for spot in spots:
        f = floors.setdefault(
            spot.floor,
            {"floor": spot.floor, "total": 0, "occupied": 0, "car_total": 0, "car_occupied": 0, "moto_total": 0, "moto_occupied": 0},
        )
        busy = spot.id in occupied_ids
        prefix = "moto" if spot.kind == "moto" else "car"
        f["total"] += 1
        f[f"{prefix}_total"] += 1
        if busy:
            f["occupied"] += 1
            f[f"{prefix}_occupied"] += 1
    for f in floors.values():
        f["free"] = f["total"] - f["occupied"]
    return list(floors.values())
