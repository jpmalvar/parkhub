import math

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import CSRF_COOKIE
from ..database import get_db
from ..models import User
from ..schemas import ChangePasswordIn, LoginIn, RegisterIn
from ..security import (
    burn_password_check,
    end_session,
    get_current_user,
    get_optional_user,
    hash_password,
    login_limiter,
    set_csrf_cookie,
    start_session,
    verify_password,
)
from ..serializers import user_dict
from ..services import audit
from ..services.realtime import manager
from ..utils import utcnow

router = APIRouter(prefix="/api/auth", tags=["Autenticação"])


@router.post("/register", status_code=201, summary="Criar conta de cliente")
def register(data: RegisterIn, request: Request, response: Response, background: BackgroundTasks, db: Session = Depends(get_db)):
    if db.scalar(select(User.id).where(User.username == data.username)):
        raise HTTPException(409, "Este nome de usuário já está em uso. Escolha outro.")
    user = User(
        username=data.username,
        full_name=data.full_name,
        password_hash=hash_password(data.password),
        role="user",
        last_login_at=utcnow(),
    )
    db.add(user)
    db.flush()
    audit.record(db, "cadastro", f"Nova conta: {user.full_name}", user=user, request=request)
    db.commit()
    start_session(response, user)
    background.add_task(manager.broadcast, {"type": "users"})
    return {"user": user_dict(user)}


@router.post("/login", summary="Entrar no sistema")
def login(data: LoginIn, request: Request, response: Response, db: Session = Depends(get_db)):
    username = data.username.strip().lower()
    ip = audit.client_ip(request)

    wait = login_limiter.retry_after(ip, username)
    if wait:
        raise HTTPException(429, f"Muitas tentativas sem sucesso. Aguarde {math.ceil(wait / 60)} min e tente novamente.")

    user = db.scalar(select(User).where(User.username == username))
    if user is None:
        burn_password_check(data.password)
    if user is None or not verify_password(data.password, user.password_hash):
        remaining = login_limiter.fail(ip, username)
        audit.record(db, "login_falhou", f"Tentativa para '{username[:24]}'", request=request, username=username[:24])
        db.commit()
        message = "Usuário ou senha incorretos."
        if 0 < remaining <= 2:
            message += f" Restam {remaining} tentativa(s) antes do bloqueio temporário."
        elif remaining == 0:
            message = "Muitas tentativas sem sucesso. Acesso bloqueado temporariamente por 5 minutos."
        raise HTTPException(401, message)

    if not user.is_active:
        raise HTTPException(403, "Esta conta está desativada. Procure a administração do estacionamento.")

    login_limiter.reset(ip, username)
    user.last_login_at = utcnow()
    audit.record(db, "login", "Login realizado", user=user, request=request)
    db.commit()
    start_session(response, user)
    return {"user": user_dict(user)}


@router.post("/logout", summary="Sair")
def logout(request: Request, response: Response, db: Session = Depends(get_db), user: User | None = Depends(get_optional_user)):
    if user:
        audit.record(db, "logout", "Sessão encerrada", user=user, request=request)
        db.commit()
    end_session(response)
    return {"ok": True}


@router.get("/me", summary="Usuário da sessão atual")
def me(request: Request, response: Response, user: User = Depends(get_current_user)):
    if not request.cookies.get(CSRF_COOKIE):
        set_csrf_cookie(response)
    return {"user": user_dict(user)}


@router.post("/change-password", summary="Alterar a própria senha")
def change_password(
    data: ChangePasswordIn,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(400, "A senha atual está incorreta.")
    if verify_password(data.new_password, user.password_hash):
        raise HTTPException(400, "A nova senha deve ser diferente da atual.")
    user.password_hash = hash_password(data.new_password)
    user.token_version += 1  # derruba as sessões abertas em outros dispositivos
    audit.record(db, "senha_alterada", "Senha alterada pelo próprio usuário", user=user, request=request)
    db.commit()
    start_session(response, user)
    return {"ok": True}
