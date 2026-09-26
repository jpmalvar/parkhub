"""Autenticação, sessões, controle de acesso e proteção contra força bruta."""
import os
import secrets
import threading
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from .config import (
    COOKIE_SECURE,
    CSRF_COOKIE,
    JWT_ALGORITHM,
    LOGIN_MAX_FAILURES,
    LOGIN_WINDOW_SECONDS,
    SECRET_KEY,
    SESSION_COOKIE,
    SESSION_TTL_HOURS,
)
from .database import get_db
from .models import User

BCRYPT_ROUNDS = int(os.getenv("PARKHUB_BCRYPT_ROUNDS", "12"))


# ---------------------------------------------------------------- senhas
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=BCRYPT_ROUNDS)).decode()


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


_dummy_hash: str | None = None


def burn_password_check(password: str) -> None:
    """Executa uma verificação falsa para que o tempo de resposta não revele se o usuário existe."""
    global _dummy_hash
    if _dummy_hash is None:
        _dummy_hash = hash_password(secrets.token_hex(8))
    verify_password(password, _dummy_hash)


# ---------------------------------------------------------------- sessões
def create_session_token(user: User) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user.id),
        "ver": user.token_version,
        "role": user.role,
        "iat": now,
        "exp": now + timedelta(hours=SESSION_TTL_HOURS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=JWT_ALGORITHM)


def set_csrf_cookie(response: Response) -> None:
    response.set_cookie(
        CSRF_COOKIE,
        secrets.token_urlsafe(32),
        httponly=False,  # o frontend precisa ler para enviar no cabeçalho (double submit)
        samesite="strict",
        secure=COOKIE_SECURE,
        max_age=SESSION_TTL_HOURS * 3600,
        path="/",
    )


def start_session(response: Response, user: User) -> None:
    response.set_cookie(
        SESSION_COOKIE,
        create_session_token(user),
        httponly=True,
        samesite="lax",
        secure=COOKIE_SECURE,
        max_age=SESSION_TTL_HOURS * 3600,
        path="/",
    )
    set_csrf_cookie(response)


def end_session(response: Response) -> None:
    response.delete_cookie(SESSION_COOKIE, path="/")
    response.delete_cookie(CSRF_COOKIE, path="/")


def _user_from_request(request: Request, db: Session) -> User | None:
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user = db.get(User, int(payload["sub"]))
    except (jwt.PyJWTError, KeyError, ValueError):
        return None
    if user is None or not user.is_active or payload.get("ver") != user.token_version:
        return None
    return user


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    user = _user_from_request(request, db)
    if user is None:
        raise HTTPException(status_code=401, detail="Sua sessão expirou. Faça login novamente.")
    return user


def get_optional_user(request: Request, db: Session = Depends(get_db)) -> User | None:
    return _user_from_request(request, db)


def require_admin(user: User = Depends(get_current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Acesso restrito à administração.")
    return user


def require_customer(user: User = Depends(get_current_user)) -> User:
    if user.is_admin:
        raise HTTPException(status_code=403, detail="Esta ação é exclusiva para clientes.")
    return user


# ---------------------------------------------------------------- força bruta
class LoginRateLimiter:
    """Bloqueia temporariamente combinações IP+usuário após falhas consecutivas."""

    def __init__(self, max_failures: int, window_seconds: int) -> None:
        self.max_failures = max_failures
        self.window = window_seconds
        self._failures: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def _key(self, ip: str | None, username: str) -> str:
        return f"{ip or '-'}|{username.lower()}"

    def _prune(self, bucket: deque[float], now: float) -> None:
        while bucket and now - bucket[0] > self.window:
            bucket.popleft()

    def retry_after(self, ip: str | None, username: str) -> int:
        now = time.monotonic()
        with self._lock:
            bucket = self._failures[self._key(ip, username)]
            self._prune(bucket, now)
            if len(bucket) >= self.max_failures:
                return int(self.window - (now - bucket[0])) + 1
        return 0

    def fail(self, ip: str | None, username: str) -> int:
        """Registra uma falha e devolve quantas tentativas ainda restam."""
        now = time.monotonic()
        with self._lock:
            bucket = self._failures[self._key(ip, username)]
            self._prune(bucket, now)
            bucket.append(now)
            return max(0, self.max_failures - len(bucket))

    def reset(self, ip: str | None, username: str) -> None:
        with self._lock:
            self._failures.pop(self._key(ip, username), None)


login_limiter = LoginRateLimiter(LOGIN_MAX_FAILURES, LOGIN_WINDOW_SECONDS)
