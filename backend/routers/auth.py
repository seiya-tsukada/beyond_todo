"""Custom authentication: e-mail + password, opaque session cookie."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Request, Response

from ..config import get_settings
from ..deps import SESSION_COOKIE, CurrentUser, DbConn, user_id
from ..errors import AppError
from ..notifications import emails
from ..repositories import users
from ..schemas import ForgotPasswordIn, LoginIn, ProfileUpdateIn, RegisterIn, ResetPasswordIn, TokenIn
from ..security import hash_password, needs_rehash, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

VERIFY_EMAIL_TTL = timedelta(hours=24)
RESET_PASSWORD_TTL = timedelta(hours=1)


def _start_session(conn: DbConn, response: Response, uid: str) -> None:
    settings = get_settings()
    token = users.create_session(conn, uid, settings.session_ttl_days)
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=settings.session_ttl_days * 86400,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )


def _clear_session_cookie(response: Response) -> None:
    response.delete_cookie(SESSION_COOKIE, path="/", secure=get_settings().cookie_secure, httponly=True, samesite="lax")


def _send_verification(conn: DbConn, user: dict) -> None:
    token = users.issue_token(conn, str(user["id"]), "verify_email", VERIFY_EMAIL_TTL)
    emails.send_verification_email(user["email"], user["name"], token)


@router.post("/register", status_code=201)
def register(body: RegisterIn, response: Response, conn: DbConn):
    if users.get_by_email(conn, body.email):
        raise AppError(400, "このメールアドレスは既に登録されています。")
    user = users.create(
        conn,
        email=body.email,
        password_hash=hash_password(body.password),
        name=body.name.strip(),
        title=(body.title or "").strip() or None,
    )
    _start_session(conn, response, str(user["id"]))
    _send_verification(conn, user)
    return {
        "user": users.public_user(user),
        "message": "アカウントを作成しました。確認メールをお送りしたので、メール内のリンクを開いてください。",
    }


@router.post("/login")
def login(body: LoginIn, response: Response, conn: DbConn):
    user = users.get_by_email(conn, body.email)
    if not verify_password(user["password_hash"] if user else None, body.password) or user is None:
        raise AppError(401, "メールアドレスまたはパスワードが正しくありません。")
    if needs_rehash(user["password_hash"]):
        users.update(conn, str(user["id"]), {"password_hash": hash_password(body.password)})
    _start_session(conn, response, str(user["id"]))
    return {"user": users.public_user(user)}


@router.post("/demo-login")
def demo_login(response: Response, conn: DbConn):
    """Skip the login form while DATA_BACKEND=mock; signs in as the demo user."""
    if get_settings().data_backend != "mock":
        raise AppError(404, "Not Found")
    from ..repositories.mock.users import DEMO_EMAIL

    user = users.get_by_email(conn, DEMO_EMAIL)
    if user is None:
        raise AppError(404, "Not Found")
    _start_session(conn, response, str(user["id"]))
    return {"user": users.public_user(user)}


@router.post("/logout")
def logout(request: Request, response: Response, conn: DbConn):
    token = request.cookies.get(SESSION_COOKIE)
    if token:
        users.delete_session(conn, token)
    _clear_session_cookie(response)
    return {"success": True}


@router.get("/me")
def me(user: CurrentUser):
    return {"user": users.public_user(user)}


@router.patch("/me")
def update_me(body: ProfileUpdateIn, user: CurrentUser, conn: DbConn):
    values = body.model_dump(exclude_unset=True, exclude_none=True)
    if "name" in values:
        values["name"] = values["name"].strip()
    if "title" in values:
        values["title"] = values["title"].strip() or None
    updated = users.update(conn, user_id(user), values)
    return {"user": users.public_user(updated or user)}


@router.post("/verify-email")
def verify_email(body: TokenIn, conn: DbConn):
    uid = users.consume_token(conn, body.token, "verify_email")
    if uid is None:
        raise AppError(400, "確認リンクが無効か、有効期限が切れています。設定画面から確認メールを再送してください。")
    updated = users.update(conn, uid, {"email_verified_at": datetime.now(timezone.utc)})
    return {"user": users.public_user(updated) if updated else None, "message": "メールアドレスを確認しました。"}


@router.post("/verify-email/resend")
def resend_verification(user: CurrentUser, conn: DbConn):
    if user["email_verified_at"] is not None:
        return {"success": True, "message": "メールアドレスは確認済みです。"}
    _send_verification(conn, user)
    return {"success": True, "message": f"{user['email']} 宛に確認メールを再送しました。"}


@router.post("/forgot-password")
def forgot_password(body: ForgotPasswordIn, conn: DbConn):
    user = users.get_by_email(conn, body.email)
    if user is not None:
        token = users.issue_token(conn, str(user["id"]), "reset_password", RESET_PASSWORD_TTL)
        emails.send_password_reset_email(user["email"], user["name"], token)
    # Same response whether or not the address is registered
    return {
        "success": True,
        "message": f"{body.email} が登録済みの場合、パスワード再設定用のメールをお送りしました。",
    }


@router.post("/reset-password")
def reset_password(body: ResetPasswordIn, response: Response, conn: DbConn):
    uid = users.consume_token(conn, body.token, "reset_password")
    if uid is None:
        raise AppError(400, "再設定リンクが無効か、有効期限が切れています。もう一度お手続きください。")
    # Receiving the reset mail also proves ownership of the address
    user = users.get_by_id(conn, uid)
    values: dict = {"password_hash": hash_password(body.password)}
    if user and user["email_verified_at"] is None:
        values["email_verified_at"] = datetime.now(timezone.utc)
    updated = users.update(conn, uid, values)
    users.delete_all_sessions(conn, uid)
    _clear_session_cookie(response)
    if updated:
        emails.send_password_changed_email(updated["email"], updated["name"])
    return {"success": True, "message": "パスワードを再設定しました。新しいパスワードでログインしてください。"}
