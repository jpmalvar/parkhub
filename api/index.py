"""Entrada da função Python na Vercel: expõe o FastAPI que fica em backend/app."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.config import AUTO_DEMO  # noqa: E402
from app.main import app  # noqa: E402,F401
from app.seed import bootstrap  # noqa: E402

# Roda no cold start. O lifespan do FastAPI também chama, mas aqui fica garantido.
bootstrap(with_demo=AUTO_DEMO)
