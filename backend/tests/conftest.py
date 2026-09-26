import os
import sys
import tempfile
from pathlib import Path

import pytest

_tmp = tempfile.mkdtemp(prefix="parkhub-tests-")
os.environ["PARKHUB_DATA_DIR"] = _tmp
os.environ["PARKHUB_DB"] = f"sqlite:///{Path(_tmp, 'test.db').as_posix()}"
os.environ["PARKHUB_BCRYPT_ROUNDS"] = "4"
os.environ["PARKHUB_FRONTEND"] = str(Path(_tmp, "no-frontend"))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient  # noqa: E402

from app.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.security import login_limiter  # noqa: E402
from app.seed import init_db  # noqa: E402


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.drop_all(engine)
    init_db()
    login_limiter._failures.clear()
    yield


def _client() -> TestClient:
    return TestClient(app)


class Api:
    """Pequeno wrapper que envia automaticamente o token CSRF, como o frontend faz."""

    def __init__(self) -> None:
        self.client = _client()

    def _headers(self):
        token = self.client.cookies.get("ph_csrf")
        return {"X-CSRF-Token": token} if token else {}

    def get(self, url, **kw):
        return self.client.get(url, **kw)

    def post(self, url, json=None, **kw):
        return self.client.post(url, json=json, headers=self._headers(), **kw)

    def put(self, url, json=None, **kw):
        return self.client.put(url, json=json, headers=self._headers(), **kw)

    def patch(self, url, json=None, **kw):
        return self.client.patch(url, json=json, headers=self._headers(), **kw)

    def delete(self, url, **kw):
        return self.client.delete(url, headers=self._headers(), **kw)


def register(username="maria", password="senha1234", full_name="Maria Silva") -> Api:
    api = Api()
    r = api.post(
        "/api/auth/register",
        {"username": username, "full_name": full_name, "password": password, "confirm_password": password},
    )
    assert r.status_code == 201, r.text
    return api


def login(username, password) -> Api:
    api = Api()
    r = api.post("/api/auth/login", {"username": username, "password": password})
    assert r.status_code == 200, r.text
    return api


@pytest.fixture
def customer() -> Api:
    return register()


@pytest.fixture
def admin() -> Api:
    return login("admin", "admin123")
