from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..errors import DomainError
from ..models import User, Vehicle
from ..schemas import VehicleIn
from ..security import require_customer
from ..serializers import vehicle_dict
from ..services import audit, plates

router = APIRouter(prefix="/api/vehicles", tags=["Meus veículos"])

MAX_VEHICLES = 10


@router.get("", summary="Listar veículos salvos")
def list_vehicles(db: Session = Depends(get_db), user: User = Depends(require_customer)):
    vehicles = db.scalars(select(Vehicle).where(Vehicle.user_id == user.id).order_by(Vehicle.created_at)).all()
    return {"items": [vehicle_dict(v) for v in vehicles]}


@router.post("", status_code=201, summary="Salvar um veículo")
def add_vehicle(data: VehicleIn, request: Request, db: Session = Depends(get_db), user: User = Depends(require_customer)):
    if db.scalar(select(Vehicle.id).where(Vehicle.user_id == user.id, Vehicle.plate == data.plate)):
        raise DomainError(409, "Este veículo já está salvo na sua conta.")
    count = len(db.scalars(select(Vehicle.id).where(Vehicle.user_id == user.id)).all())
    if count >= MAX_VEHICLES:
        raise DomainError(409, f"Limite de {MAX_VEHICLES} veículos salvos atingido.")
    vehicle = Vehicle(user_id=user.id, plate=data.plate, kind=data.kind, nickname=data.nickname)
    db.add(vehicle)
    audit.record(db, "veiculo_salvo", f"{plates.display(data.plate)} ({data.kind})", user=user, request=request)
    db.commit()
    return {"vehicle": vehicle_dict(vehicle)}


@router.delete("/{vehicle_id}", summary="Remover veículo salvo")
def delete_vehicle(vehicle_id: int, request: Request, db: Session = Depends(get_db), user: User = Depends(require_customer)):
    vehicle = db.get(Vehicle, vehicle_id)
    if vehicle is None or vehicle.user_id != user.id:
        raise DomainError(404, "Veículo não encontrado.")
    audit.record(db, "veiculo_removido", plates.display(vehicle.plate), user=user, request=request)
    db.delete(vehicle)
    db.commit()
    return {"ok": True}
