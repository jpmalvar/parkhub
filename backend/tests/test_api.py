from datetime import timedelta

from app.database import SessionLocal
from app.models import Ticket

from .conftest import Api, login, register


def first_spot(api: Api, kind="carro", floor=1):
    floors = api.get("/api/spots").json()["floors"]
    spot = next(s for s in floors[floor - 1]["spots"] if s["kind"] == kind and not s["occupied"])
    return spot["id"]


def park(api: Api, plate="ABC-1234", kind="carro", spot_id=None):
    spot_id = spot_id or first_spot(api, kind)
    return api.post("/api/tickets", {"spot_id": spot_id, "plate": plate, "vehicle_kind": kind})


def backdate(code: str, minutes: int):
    with SessionLocal() as db:
        t = db.query(Ticket).filter_by(code=code).one()
        t.entry_at = t.entry_at - timedelta(minutes=minutes)
        db.commit()


# ------------------------------------------------------------------ autenticação e segurança
def test_register_and_me(customer):
    me = customer.get("/api/auth/me").json()["user"]
    assert me["username"] == "maria" and me["role"] == "user"


def test_password_is_hashed():
    register()
    from app.models import User

    with SessionLocal() as db:
        user = db.query(User).filter_by(username="maria").one()
        assert user.password_hash != "senha1234" and user.password_hash.startswith("$2")


def test_weak_password_rejected():
    api = Api()
    r = api.post("/api/auth/register", {"username": "joao", "full_name": "João", "password": "abc", "confirm_password": "abc"})
    assert r.status_code == 422 and "8 caracteres" in r.json()["detail"]


def test_duplicate_username(customer):
    api = Api()
    r = api.post("/api/auth/register", {"username": "MARIA", "full_name": "Outra Maria", "password": "senha1234", "confirm_password": "senha1234"})
    assert r.status_code == 409


def test_login_bruteforce_lockout():
    api = Api()
    for _ in range(5):
        assert api.post("/api/auth/login", {"username": "admin", "password": "errada"}).status_code == 401
    r = api.post("/api/auth/login", {"username": "admin", "password": "admin123"})
    assert r.status_code == 429


def test_csrf_required(customer):
    r = customer.client.post("/api/tickets", json={"spot_id": 1, "plate": "ABC1234", "vehicle_kind": "carro"})
    assert r.status_code == 403


def test_security_headers():
    r = Api().get("/api/health")
    assert r.headers["x-frame-options"] == "DENY"
    assert "default-src 'self'" in r.headers["content-security-policy"]


def test_change_password_invalidates_old_sessions(customer):
    other_device = login("maria", "senha1234")
    r = customer.post("/api/auth/change-password", {"current_password": "senha1234", "new_password": "nova12345", "confirm_password": "nova12345"})
    assert r.status_code == 200
    assert customer.get("/api/auth/me").status_code == 200
    assert other_device.get("/api/auth/me").status_code == 401


# ------------------------------------------------------------------ fluxo do estacionamento
def test_full_parking_flow(customer):
    r = park(customer, "abc-1234")
    assert r.status_code == 201, r.text
    ticket = r.json()["ticket"]
    assert ticket["code"] == "1001" and ticket["plate"] == "ABC1234"

    spots = customer.get("/api/spots").json()["floors"][0]["spots"]
    assert any(s["occupied"] and s["mine"] for s in spots)

    backdate(ticket["code"], 90)  # 1h30 → 2 horas cobradas
    detail = customer.get(f"/api/tickets/{ticket['code']}").json()
    assert detail["quote"]["billed_hours"] == 2 and detail["quote"]["amount_cents"] == 2000

    r = customer.post(f"/api/tickets/{ticket['code']}/pay", {"method": "cartao", "card": {"number": "4111111111111111", "holder": "MARIA SILVA", "expiry": "12/99", "cvv": "123"}})
    assert r.status_code == 200, r.text
    paid = r.json()["ticket"]
    assert paid["status"] == "paid" and paid["amount_cents"] == 2000 and "Visa final 1111" in paid["payment_detail"]

    pdf = customer.get(f"/api/tickets/{ticket['code']}/receipt.pdf")
    assert pdf.status_code == 200 and pdf.content.startswith(b"%PDF")

    # a vaga foi liberada e não é possível pagar duas vezes
    assert customer.post(f"/api/tickets/{ticket['code']}/pay", {"method": "pix"}).status_code == 409
    assert customer.get("/api/me/summary").json()["total_spent_cents"] == 2000


def test_grace_period_exit_is_free(customer):
    code = park(customer).json()["ticket"]["code"]
    r = customer.post(f"/api/tickets/{code}/pay", {"method": "pix"})
    assert r.json()["ticket"]["payment_method"] == "isento" and r.json()["ticket"]["amount_cents"] == 0


def test_cash_change(customer):
    code = park(customer).json()["ticket"]["code"]
    backdate(code, 30)
    assert customer.post(f"/api/tickets/{code}/pay", {"method": "dinheiro", "cash_received_cents": 500}).status_code == 422
    r = customer.post(f"/api/tickets/{code}/pay", {"method": "dinheiro", "cash_received_cents": 2000})
    assert r.json()["change_cents"] == 1000


def test_same_plate_with_or_without_hyphen_blocked(customer):
    assert park(customer, "ABC-1234").status_code == 201
    r = park(customer, "abc1234")
    assert r.status_code == 409 and "já está na garagem" in r.json()["detail"]


def test_occupied_spot_blocked(customer):
    spot = first_spot(customer)
    assert park(customer, "AAA1111", spot_id=spot).status_code == 201
    other = register("joao", full_name="João Souza")
    assert park(other, "BBB2222", spot_id=spot).status_code == 409


def test_moto_spot_rules(customer):
    moto_spot = first_spot(customer, "moto")
    r = park(customer, "CAR1234", "carro", spot_id=moto_spot)
    assert r.status_code == 422 and "exclusiva para motos" in r.json()["detail"]
    assert park(customer, "MOT1A23", "moto", spot_id=moto_spot).status_code == 201


def test_max_active_tickets(customer):
    for plate in ("AAA1111", "BBB2222", "CCC3333"):
        assert park(customer, plate).status_code == 201
    assert park(customer, "DDD4444").status_code == 409


def test_cannot_access_other_users_ticket(customer):
    code = park(customer).json()["ticket"]["code"]
    intruder = register("intruso", full_name="Pessoa Intrusa")
    assert intruder.get(f"/api/tickets/{code}").status_code == 404
    assert intruder.post(f"/api/tickets/{code}/pay", {"method": "pix"}).status_code == 404


def test_lookup_requires_matching_plate(customer):
    code = park(customer, "BRA2E19").json()["ticket"]["code"]
    assert customer.post("/api/tickets/lookup", {"code": code, "plate": "bra-2e19"}).status_code == 200
    assert customer.post("/api/tickets/lookup", {"code": code, "plate": "XYZ9999"}).status_code == 404


def test_vehicles_crud(customer):
    r = customer.post("/api/vehicles", {"plate": "bra2e19", "kind": "carro", "nickname": "Meu carro"})
    assert r.status_code == 201
    assert customer.post("/api/vehicles", {"plate": "BRA-2E19", "kind": "carro"}).status_code == 409
    vid = r.json()["vehicle"]["id"]
    assert customer.delete(f"/api/vehicles/{vid}").status_code == 200
    assert customer.get("/api/vehicles").json()["items"] == []


# ------------------------------------------------------------------ administração
def test_admin_routes_forbidden_for_customers(customer):
    assert customer.get("/api/admin/stats").status_code == 403
    assert customer.put("/api/admin/settings", {}).status_code in (403, 422)


def test_admin_settings_and_reports(admin, customer):
    s = admin.get("/api/admin/settings").json()
    s["hourly_car_cents"] = 1500
    r = admin.put("/api/admin/settings", s)
    assert r.status_code == 200 and r.json()["hourly_car_cents"] == 1500

    code = park(customer).json()["ticket"]["code"]
    backdate(code, 50)
    assert customer.get(f"/api/tickets/{code}").json()["quote"]["amount_cents"] == 1500

    report = admin.get("/api/admin/tickets?status=active").json()
    assert report["summary"]["count"] == 1 and report["items"][0]["user"]["username"] == "maria"
    assert admin.get("/api/admin/search?q=abc1").json()["active"][0]["code"] == code

    csv = admin.get("/api/admin/tickets/export?format=csv")
    assert csv.status_code == 200 and "ABC-1234" in csv.text
    pdf = admin.get("/api/admin/tickets/export?format=pdf")
    assert pdf.content.startswith(b"%PDF")

    stats = admin.get("/api/admin/stats?days=7").json()
    assert stats["kpis"]["occupied"] == 1 and len(stats["revenue_series"]) == 7

    actions = {a["action"] for a in admin.get("/api/admin/audit").json()["items"]}
    assert {"tarifas", "entrada", "exportacao"} <= actions


def test_admin_can_checkout_any_ticket(admin, customer):
    code = park(customer).json()["ticket"]["code"]
    backdate(code, 120)
    r = admin.post(f"/api/tickets/{code}/pay", {"method": "dinheiro", "cash_received_cents": 5000})
    assert r.status_code == 200 and r.json()["ticket"]["status"] == "paid"


def test_deactivated_user_loses_access(admin, customer):
    uid = customer.get("/api/auth/me").json()["user"]["id"]
    assert admin.patch(f"/api/admin/users/{uid}", {"is_active": False}).status_code == 200
    assert customer.get("/api/auth/me").status_code == 401
    r = Api().post("/api/auth/login", {"username": "maria", "password": "senha1234"})
    assert r.status_code == 403


def test_public_overview():
    data = Api().get("/api/public/overview").json()
    assert data["total"] == 45 and data["free"] == 45 and len(data["floors"]) == 3
    assert data["floors"][0]["moto_total"] == 3
