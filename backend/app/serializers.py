"""Conversão dos modelos em dicionários JSON enviados ao frontend."""
from .models import Spot, Ticket, User, Vehicle
from .services import plates
from .utils import iso


def user_dict(user: User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "full_name": user.full_name,
        "role": user.role,
        "is_active": user.is_active,
        "created_at": iso(user.created_at),
        "last_login_at": iso(user.last_login_at),
    }


def spot_dict(spot: Spot) -> dict:
    return {"id": spot.id, "floor": spot.floor, "number": spot.number, "code": spot.code, "kind": spot.kind}


def vehicle_dict(vehicle: Vehicle) -> dict:
    return {
        "id": vehicle.id,
        "plate": vehicle.plate,
        "plate_display": plates.display(vehicle.plate),
        "plate_format": plates.plate_format(vehicle.plate),
        "kind": vehicle.kind,
        "nickname": vehicle.nickname,
        "created_at": iso(vehicle.created_at),
    }


def ticket_dict(ticket: Ticket, include_user: bool = False) -> dict:
    data = {
        "code": ticket.code,
        "plate": ticket.plate,
        "plate_display": plates.display(ticket.plate),
        "plate_format": plates.plate_format(ticket.plate),
        "vehicle_kind": ticket.vehicle_kind,
        "spot": spot_dict(ticket.spot),
        "entry_at": iso(ticket.entry_at),
        "exit_at": iso(ticket.exit_at),
        "status": ticket.status,
        "amount_cents": ticket.amount_cents,
        "billed_hours": ticket.billed_hours,
        "payment_method": ticket.payment_method,
        "payment_detail": ticket.payment_detail,
        "payment_ref": ticket.payment_ref,
        "duration_minutes": (
            int((ticket.exit_at - ticket.entry_at).total_seconds() // 60) if ticket.exit_at else None
        ),
    }
    if include_user:
        data["user"] = {"id": ticket.user.id, "username": ticket.user.username, "full_name": ticket.user.full_name}
    return data
