"""Ponto de entrada da aplicação ParkHub (API + frontend compilado)."""
import secrets
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware

from . import __version__
from .config import CSRF_COOKIE, CSRF_HEADER, FRONTEND_DIST
from .errors import DomainError
from .routers import admin, auth, me, public, spots, tickets, vehicles
from .seed import init_db


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="ParkHub API",
    description="API do ParkHub — gestão inteligente de estacionamentos. Autenticação por cookie de sessão + token CSRF.",
    version=__version__,
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url=None,
    openapi_url="/api/openapi.json",
)

SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}
CSRF_EXEMPT = {"/api/auth/login", "/api/auth/register"}
CSP = (
    "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; "
    "font-src 'self' data:; script-src 'self'; connect-src 'self' ws: wss:; "
    "frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
)


class SecurityMiddleware(BaseHTTPMiddleware):
    """Proteção CSRF (double submit cookie) e cabeçalhos de segurança HTTP."""

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if request.method not in SAFE_METHODS and path.startswith("/api/") and path not in CSRF_EXEMPT:
            cookie = request.cookies.get(CSRF_COOKIE, "")
            header = request.headers.get(CSRF_HEADER, "")
            if not cookie or not header or not secrets.compare_digest(cookie, header):
                return JSONResponse(
                    {"detail": "Falha na verificação de segurança. Recarregue a página e tente novamente."},
                    status_code=403,
                )
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        if not path.startswith("/api/docs"):
            response.headers["Content-Security-Policy"] = CSP
        if path.startswith("/api/"):
            response.headers.setdefault("Cache-Control", "no-store")
        return response


app.add_middleware(SecurityMiddleware)


@app.exception_handler(DomainError)
async def _domain_error(_request: Request, exc: DomainError):
    return JSONResponse({"detail": exc.message}, status_code=exc.status_code)


@app.exception_handler(RequestValidationError)
async def _validation_error(_request: Request, exc: RequestValidationError):
    message = "Dados inválidos. Revise os campos e tente novamente."
    errors = exc.errors()
    if errors:
        first = errors[0]
        text = str(first.get("msg", ""))
        if text.startswith("Value error, "):
            message = text.removeprefix("Value error, ")
        else:
            field = ".".join(str(p) for p in first.get("loc", [])[1:])
            if field:
                message = f"Campo inválido: {field}."
    return JSONResponse({"detail": message}, status_code=422)


for module in (auth, public, spots, tickets, vehicles, me, admin):
    app.include_router(module.router)


# ------------------------------------------------------------------ frontend (SPA)
if (FRONTEND_DIST / "assets").is_dir():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

_BUILD_MISSING = """<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>ParkHub</title>
<body style="font-family:system-ui;background:#070a12;color:#e8ecf5;display:grid;place-items:center;height:100vh;margin:0">
<div style="text-align:center"><h1>ParkHub API no ar ✅</h1><p>O frontend ainda não foi compilado.
Rode <code>npm run build</code> na pasta <code>frontend</code> ou use o <code>iniciar.bat</code>.</p>
<p><a style="color:#8b7dff" href="/api/docs">Documentação da API</a></p></div></body></html>"""


@app.get("/{full_path:path}", include_in_schema=False)
async def spa(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(404, "Recurso não encontrado.")
    dist = FRONTEND_DIST.resolve()
    if full_path:
        candidate = (dist / full_path).resolve()
        if candidate.is_file() and dist in candidate.parents:
            return FileResponse(candidate)
    index = dist / "index.html"
    if index.is_file():
        return FileResponse(index, headers={"Cache-Control": "no-cache"})
    return HTMLResponse(_BUILD_MISSING)
