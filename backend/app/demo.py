"""Popula o banco com dados realistas de demonstração.

Uso:
    python -m app.demo           # popula apenas se o banco ainda não tiver movimentação
    python -m app.demo --reset   # apaga tudo e recria do zero
"""
import random
import string
import sys
from datetime import datetime, time, timedelta

from sqlalchemy import select, text

from .database import Base, SessionLocal, engine
from .models import AuditLog, Spot, Ticket, User, Vehicle
from .security import hash_password
from .seed import init_db
from .services import plates
from .services.pricing import compute_quote
from .services.settings_service import get_settings, tariff_for
from .utils import brl, local_to_utc, to_local, utcnow

DEMO_USERNAME = "cliente"
DEMO_PASSWORD = "cliente123"
OTHERS_PASSWORD = "parkhub123"
HISTORY_DAYS = 75

PEOPLE = [
    ("cliente", "Marina Costa"),
    ("rafael.souza", "Rafael Souza"),
    ("ana.lima", "Ana Beatriz Lima"),
    ("lucas_m", "Lucas Martins"),
    ("julia.rocha", "Júlia Rocha"),
    ("pedro.alves", "Pedro Henrique Alves"),
    ("camila.f", "Camila Ferreira"),
    ("gustavo.r", "Gustavo Ribeiro"),
    ("larissa", "Larissa Mendes"),
    ("bruno.c", "Bruno Carvalho"),
    ("fernanda.g", "Fernanda Gomes"),
    ("thiago.n", "Thiago Nascimento"),
    ("beatriz.s", "Beatriz Santos"),
    ("diego.p", "Diego Pereira"),
    ("isabela", "Isabela Araújo"),
    ("mateus.b", "Mateus Barbosa"),
]
NICKNAMES = ["Carro do trabalho", "Meu carro", "Carro da família", "Moto", "SUV", "Carro reserva", None, None]


def random_plate(rng: random.Random, used: set[str]) -> str:
    while True:
        letters = "".join(rng.choices(string.ascii_uppercase, k=3))
        if rng.random() < 0.6:
            plate = f"{letters}{rng.randint(0, 9)}{rng.choice(string.ascii_uppercase)}{rng.randint(0, 99):02d}"
        else:
            plate = f"{letters}{rng.randint(0, 9999):04d}"
        if plate not in used and plates.is_valid(plate):
            used.add(plate)
            return plate


def sample_entry_hour(rng: random.Random) -> float:
    while True:
        peak = rng.choices([8.0, 12.3, 18.2, 15.0], weights=[36, 22, 28, 14])[0]
        hour = rng.gauss(peak, 1.5)
        if 6.0 <= hour <= 23.5:
            return hour


def sample_duration_minutes(rng: random.Random) -> int:
    bucket = rng.choices(["grace", "short", "medium", "long", "overnight"], weights=[9, 55, 24, 9, 3])[0]
    if bucket == "grace":
        return rng.randint(3, 14)
    if bucket == "short":
        return rng.randint(20, 240)
    if bucket == "medium":
        return rng.randint(240, 600)
    if bucket == "long":
        return rng.randint(600, 1400)
    return rng.randint(1440, 3200)


def payment_for(rng: random.Random, amount: int) -> tuple[str, str, str | None]:
    if amount == 0:
        return "isento", "Saída dentro do período de tolerância", None
    method = rng.choices(["pix", "cartao", "dinheiro"], weights=[52, 34, 14])[0]
    if method == "pix":
        return "pix", "Pix · confirmação instantânea", "PH" + "".join(rng.choices(string.ascii_uppercase + string.digits, k=16))
    if method == "cartao":
        brand = rng.choice(["Visa", "Mastercard", "Elo", "Mastercard", "Visa", "Amex"])
        return "cartao", f"{brand} final {rng.randint(1000, 9999)}", f"AUT{rng.randint(100000, 999999)}"
    received = max(amount, ((amount + 999) // 1000) * 1000 if rng.random() < 0.7 else ((amount + 4999) // 5000) * 5000)
    return "dinheiro", f"Recebido {brl(received)} · troco {brl(received - amount)}", None


def populate(reset: bool = False) -> None:
    if reset:
        Base.metadata.drop_all(engine)
    init_db()
    rng = random.Random(2026)

    with SessionLocal() as db:
        if db.scalar(select(Ticket.id).limit(1)) and not reset:
            print("[ParkHub] O banco já possui movimentação — nada a fazer (use --reset para recriar).")
            return

        settings = get_settings(db)
        spots = db.scalars(select(Spot)).all()
        car_spots = [s for s in spots if s.kind == "carro"]
        moto_spots = [s for s in spots if s.kind == "moto"]
        now = utcnow()
        today = to_local(now).date()

        demo_hash = hash_password(DEMO_PASSWORD)
        others_hash = hash_password(OTHERS_PASSWORD)
        used_plates: set[str] = set()
        users: list[User] = []
        garage: dict[int, list[Vehicle]] = {}
        for i, (username, name) in enumerate(PEOPLE):
            created = now - timedelta(days=HISTORY_DAYS + 5 - i * 3, hours=rng.randint(0, 12))
            user = User(
                username=username,
                full_name=name,
                password_hash=demo_hash if username == DEMO_USERNAME else others_hash,
                role="user",
                created_at=created,
                last_login_at=now - timedelta(hours=rng.randint(1, 200)),
            )
            db.add(user)
            db.flush()
            users.append(user)
            vehicles = []
            for n in range(rng.choice([1, 1, 2, 2, 3]) if username != DEMO_USERNAME else 2):
                kind = "moto" if (rng.random() < 0.18 or (username == DEMO_USERNAME and n == 1)) else "carro"
                v = Vehicle(
                    user_id=user.id,
                    plate=random_plate(rng, used_plates),
                    kind=kind,
                    nickname=("Minha moto" if kind == "moto" else rng.choice(NICKNAMES)),
                    created_at=created + timedelta(minutes=5 + n),
                )
                db.add(v)
                vehicles.append(v)
            garage[user.id] = vehicles
        db.flush()

        # Usuários mais assíduos aparecem com mais frequência
        weights = [6 if u.username == DEMO_USERNAME else rng.uniform(1, 5) for u in users]

        history: list[tuple[Ticket, User]] = []
        for day_offset in range(HISTORY_DAYS, -1, -1):
            day = today - timedelta(days=day_offset)
            weekend = day.weekday() >= 5
            trend = 1 + (HISTORY_DAYS - day_offset) / HISTORY_DAYS * 0.35  # movimento crescendo ao longo do tempo
            n = int(rng.randint(12, 20) * trend) if weekend else int(rng.randint(24, 36) * trend)
            for _ in range(n):
                user = rng.choices(users, weights=weights)[0]
                vehicle = rng.choice(garage[user.id])
                hour = sample_entry_hour(rng)
                entry_local = datetime.combine(day, time.min) + timedelta(hours=hour, seconds=rng.randint(0, 59))
                entry = local_to_utc(entry_local)
                exit_ = entry + timedelta(minutes=sample_duration_minutes(rng), seconds=rng.randint(0, 59))
                if exit_ >= now - timedelta(minutes=5) or entry < user.created_at:
                    continue
                q = compute_quote(entry, exit_, tariff_for(vehicle.kind, settings))
                method, detail, ref = payment_for(rng, q.amount_cents)
                spot = rng.choice(moto_spots if vehicle.kind == "moto" else car_spots)
                ticket = Ticket(
                    user_id=user.id,
                    plate=vehicle.plate,
                    vehicle_kind=vehicle.kind,
                    spot_id=spot.id,
                    entry_at=entry,
                    exit_at=exit_,
                    status="paid",
                    amount_cents=q.amount_cents,
                    billed_hours=q.billed_hours,
                    payment_method=method,
                    payment_detail=detail,
                    payment_ref=ref,
                    closed_by=user.username,
                )
                history.append((ticket, user))

        # Veículos atualmente no pátio (placas e vagas sem repetição)
        active: list[tuple[Ticket, User]] = []
        taken_spots: set[int] = set()
        busy_plates: set[str] = set()

        demo_user = users[0]
        demo_car = next(v for v in garage[demo_user.id] if v.kind == "carro") if any(
            v.kind == "carro" for v in garage[demo_user.id]
        ) else garage[demo_user.id][0]
        demo_spot = next(s for s in car_spots if s.floor == 1 and s.number == 4)
        active.append(
            (
                Ticket(
                    user_id=demo_user.id,
                    plate=demo_car.plate,
                    vehicle_kind=demo_car.kind,
                    spot_id=demo_spot.id,
                    entry_at=now - timedelta(hours=1, minutes=42),
                    status="active",
                ),
                demo_user,
            )
        )
        taken_spots.add(demo_spot.id)
        busy_plates.add(demo_car.plate)

        target = rng.randint(22, 27)
        attempts = 0
        while len(active) < target and attempts < 500:
            attempts += 1
            user = rng.choices(users[1:], weights=weights[1:])[0]
            vehicle = rng.choice(garage[user.id])
            if vehicle.plate in busy_plates:
                continue
            pool = [s for s in (moto_spots if vehicle.kind == "moto" else car_spots) if s.id not in taken_spots]
            if not pool:
                continue
            spot = rng.choice(pool)
            minutes_ago = rng.choice([rng.randint(8, 120), rng.randint(60, 480), rng.randint(120, 600), rng.randint(1500, 2600)])
            if minutes_ago > 1440 and rng.random() < 0.7:
                minutes_ago = rng.randint(30, 300)
            active.append(
                (
                    Ticket(
                        user_id=user.id,
                        plate=vehicle.plate,
                        vehicle_kind=vehicle.kind,
                        spot_id=spot.id,
                        entry_at=now - timedelta(minutes=minutes_ago, seconds=rng.randint(0, 59)),
                        status="active",
                    ),
                    user,
                )
            )
            taken_spots.add(spot.id)
            busy_plates.add(vehicle.plate)

        # Evita que um veículo apareça no histórico saindo depois de já ter entrado de novo.
        active_entry = {t.plate: t.entry_at for t, _ in active}
        history = [
            (t, u) for t, u in history if t.plate not in active_entry or t.exit_at < active_entry[t.plate] - timedelta(minutes=20)
        ]

        # Insere em ordem cronológica para que a numeração dos tickets siga a linha do tempo (a partir de 1001).
        all_tickets = sorted(history + active, key=lambda pair: pair[0].entry_at)
        spot_by_id = {s.id: s for s in spots}
        logs: list[AuditLog] = []
        # IDs definidos aqui mesmo (a tabela está vazia) para não precisar de um flush por ticket.
        for number, (ticket, user) in enumerate(all_tickets, start=1):
            ticket.id = number
            ticket.code = str(1000 + number)
            db.add(ticket)
            spot = spot_by_id[ticket.spot_id]
            ip = f"192.168.0.{rng.randint(10, 250)}"
            logs.append(
                AuditLog(
                    created_at=ticket.entry_at,
                    user_id=user.id,
                    username=user.username,
                    action="entrada",
                    detail=f"Ticket #{ticket.code} · {plates.display(ticket.plate)} · vaga {spot.code}",
                    ip=ip,
                )
            )
            if ticket.status == "paid":
                label = {"pix": "Pix", "cartao": "Cartão", "dinheiro": "Dinheiro", "isento": "Isento"}[ticket.payment_method]
                logs.append(
                    AuditLog(
                        created_at=ticket.exit_at,
                        user_id=user.id,
                        username=user.username,
                        action="saida",
                        detail=f"Ticket #{ticket.code} · {plates.display(ticket.plate)} · {label} · {brl(ticket.amount_cents)}",
                        ip=ip,
                    )
                )
        for user in users:
            logs.append(AuditLog(created_at=user.created_at, user_id=user.id, username=user.username, action="cadastro", detail=f"Nova conta: {user.full_name}", ip="192.168.0.20"))
            logs.append(AuditLog(created_at=user.last_login_at, user_id=user.id, username=user.username, action="login", detail="Login realizado", ip="192.168.0.20"))
        for _ in range(4):
            logs.append(AuditLog(created_at=now - timedelta(days=rng.randint(1, 20), minutes=rng.randint(0, 600)), username="admin", action="login_falhou", detail="Tentativa para 'admin'", ip="203.0.113.77"))
        db.add_all(logs)
        db.flush()
        if engine.dialect.name == "postgresql":
            # Como os IDs foram passados manualmente, a sequence do Postgres precisa ser acertada.
            db.execute(text("SELECT setval(pg_get_serial_sequence('tickets', 'id'), (SELECT MAX(id) FROM tickets))"))
        db.commit()

        print(
            f"[ParkHub] Demonstração pronta: {len(users)} clientes, {len(history)} tickets no histórico, "
            f"{len(active)} veículos no pátio."
        )
        print(f"[ParkHub] Acesso cliente: {DEMO_USERNAME} / {DEMO_PASSWORD}  ·  Acesso admin: admin / admin123")


if __name__ == "__main__":
    populate(reset="--reset" in sys.argv)
