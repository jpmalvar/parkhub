"""Configurações centrais da aplicação (podem ser sobrescritas por variáveis de ambiente)."""
import os
import secrets
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_DIR = BASE_DIR.parent
DATA_DIR = Path(os.getenv("PARKHUB_DATA_DIR", BASE_DIR / "data"))
DATA_DIR.mkdir(parents=True, exist_ok=True)

DATABASE_URL = os.getenv("PARKHUB_DB", f"sqlite:///{(DATA_DIR / 'parkhub.db').as_posix()}")
FRONTEND_DIST = Path(os.getenv("PARKHUB_FRONTEND", PROJECT_DIR / "frontend" / "dist"))

TIMEZONE = os.getenv("PARKHUB_TZ", "America/Sao_Paulo")


def _load_secret_key() -> str:
    """Usa a chave do ambiente ou gera uma chave aleatória persistente na primeira execução."""
    env_key = os.getenv("PARKHUB_SECRET_KEY")
    if env_key:
        return env_key
    key_file = DATA_DIR / "secret.key"
    if key_file.exists():
        return key_file.read_text(encoding="utf-8").strip()
    key = secrets.token_urlsafe(48)
    key_file.write_text(key, encoding="utf-8")
    return key


SECRET_KEY = _load_secret_key()
JWT_ALGORITHM = "HS256"
SESSION_TTL_HOURS = 12
SESSION_COOKIE = "ph_session"
CSRF_COOKIE = "ph_csrf"
CSRF_HEADER = "x-csrf-token"
COOKIE_SECURE = os.getenv("PARKHUB_COOKIE_SECURE", "0") == "1"

# Proteção contra força bruta no login
LOGIN_MAX_FAILURES = 5
LOGIN_WINDOW_SECONDS = 5 * 60

# Estrutura física da garagem (mesma do programa original: 3 andares x 15 vagas)
FLOORS = 3
SPOTS_PER_FLOOR = 15
MOTO_SPOTS_PER_FLOOR = 3  # as últimas vagas de cada andar são exclusivas para motos

# Regras de negócio
MAX_ACTIVE_TICKETS_PER_USER = 3

# Valores padrão (em centavos) — editáveis pelo administrador
DEFAULT_SETTINGS: dict[str, int] = {
    "hourly_car_cents": 1000,
    "hourly_moto_cents": 500,
    "daily_cap_car_cents": 6000,
    "daily_cap_moto_cents": 3000,
    "grace_minutes": 15,
}

# Conta administrativa criada automaticamente (mesma do sistema original)
DEFAULT_ADMIN_USERNAME = "admin"
DEFAULT_ADMIN_PASSWORD = "admin123"
