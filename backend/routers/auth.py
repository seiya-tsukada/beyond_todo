"""Custom authentication: e-mail + password, opaque session cookie.

Sign-up is a two-step flow: /register stores the account unverified and mails a
6-digit code; /register/verify checks the code, marks the address verified and
starts the session. Unverified accounts cannot sign in: /login mails a fresh code
and answers 403 so the client can show the code form.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Request, Response

from ..config import get_settings
from ..db import commit
from ..deps import SESSION_COOKIE, CurrentUser, DbConn, user_id
from ..errors import AppError
from ..notifications import emails
from ..repositories import users
from ..schemas import (
    EmailIn,
    ForgotPasswordIn,
    LoginIn,
    MessageOut,
    ProfileUpdateIn,
    RegisterIn,
    RegisterOut,
    ResetPasswordIn,
    SuccessOut,
    UserEnvelope,
    VerifyCodeIn,
)
from ..security import hash_password, needs_rehash, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

SIGNUP_CODE_TTL = timedelta(minutes=10)
SIGNUP_CODE_MAX_ATTEMPTS = 5
SIGNUP_CODE_RESEND_INTERVAL = timedelta(seconds=60)
RESET_PASSWORD_TTL = timedelta(hours=1)

ALREADY_REGISTERED = "このメールアドレスは既に登録されています。"
LOGIN_ERROR = "メールアドレスまたはパスワードが正しくありません。"


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


def _send_signup_code(conn: DbConn, user: dict) -> bool:
    """Mail a new code unless one went out less than SIGNUP_CODE_RESEND_INTERVAL ago."""
    uid = str(user["id"])
    last = users.last_issued_at(conn, uid, "verify_email")
    if last is not None and datetime.now(timezone.utc) - last < SIGNUP_CODE_RESEND_INTERVAL:
        return False
    code = users.issue_code(conn, uid, "verify_email", SIGNUP_CODE_TTL)
    emails.send_signup_code_email(user["email"], emails.display_name(user), code)
    return True


def _code_sent_message(email: str) -> str:
    return f"{email} 宛に6桁の確認コードを送信しました。メールに記載のコードを入力してください。"


@router.post("/register", status_code=201, response_model=RegisterOut)
def register(body: RegisterIn, conn: DbConn):
    """Create the account unverified and mail a code. No session yet."""
    user = users.get_by_email(conn, body.email)
    if user is not None:
        # Only the person who set this password may continue a pending sign-up.
        # Otherwise anyone could re-register the address with a password of their
        # own and take over the account once the real owner enters the code.
        if user["email_verified_at"] is not None or not verify_password(user["password_hash"], body.password):
            raise AppError(400, ALREADY_REGISTERED)
    else:
        user = users.create(conn, email=body.email, password_hash=hash_password(body.password))
    _send_signup_code(conn, user)
    return {"email": user["email"], "message": _code_sent_message(user["email"])}


@router.post("/register/verify", response_model=UserEnvelope)
def verify_signup_code(body: VerifyCodeIn, response: Response, conn: DbConn):
    user = users.get_by_email(conn, body.email)
    if user is None:
        raise AppError(400, "確認コードが正しくありません。")
    if user["email_verified_at"] is not None:
        raise AppError(400, "このメールアドレスは確認済みです。ログインしてください。")
    result = users.check_code(conn, str(user["id"]), "verify_email", body.code, SIGNUP_CODE_MAX_ATTEMPTS)
    if result != "ok":
        commit(conn)  # keep the counted wrong guess despite the error response
        if result == "invalid":
            raise AppError(400, "確認コードが正しくありません。")
        raise AppError(400, "確認コードの有効期限が切れたか、入力回数の上限に達しました。コードを再送してください。")
    updated = users.update(conn, str(user["id"]), {"email_verified_at": datetime.now(timezone.utc)}) or user
    _start_session(conn, response, str(updated["id"]))
    return {"user": users.public_user(updated)}


@router.post("/register/resend", response_model=MessageOut)
def resend_signup_code(body: EmailIn, conn: DbConn):
    user = users.get_by_email(conn, body.email)
    if user is not None and user["email_verified_at"] is None and not _send_signup_code(conn, user):
        raise AppError(429, "確認コードは送信済みです。1分ほど待ってから再送してください。")
    # Unknown or already-verified addresses get the same answer and no mail
    return {"success": True, "message": _code_sent_message(body.email)}


@router.post("/login", response_model=UserEnvelope)
def login(body: LoginIn, response: Response, conn: DbConn):
    user = users.get_by_email(conn, body.email)
    if not verify_password(user["password_hash"] if user else None, body.password) or user is None:
        raise AppError(401, LOGIN_ERROR)
    if user["email_verified_at"] is None:
        # Right password, sign-up not finished: send a code and let the client ask for it
        _send_signup_code(conn, user)
        commit(conn)
        raise AppError(403, f"メールアドレスの確認が完了していません。{_code_sent_message(user['email'])}")
    if needs_rehash(user["password_hash"]):
        users.update(conn, str(user["id"]), {"password_hash": hash_password(body.password)})
    _start_session(conn, response, str(user["id"]))
    return {"user": users.public_user(user)}


@router.post("/logout", response_model=SuccessOut)
def logout(request: Request, response: Response, conn: DbConn):
    token = request.cookies.get(SESSION_COOKIE)
    if token:
        users.delete_session(conn, token)
    _clear_session_cookie(response)
    return {"success": True}


@router.get("/me", response_model=UserEnvelope)
def me(user: CurrentUser):
    return {"user": users.public_user(user)}


@router.patch("/me", response_model=UserEnvelope)
def update_me(body: ProfileUpdateIn, user: CurrentUser, conn: DbConn):
    values = body.model_dump(exclude_unset=True, exclude_none=True)
    if "name" in values:
        values["name"] = values["name"].strip()
    if "title" in values:
        values["title"] = values["title"].strip() or None
    updated = users.update(conn, user_id(user), values)
    return {"user": users.public_user(updated or user)}


@router.post("/forgot-password", response_model=MessageOut)
def forgot_password(body: ForgotPasswordIn, conn: DbConn):
    user = users.get_by_email(conn, body.email)
    if user is not None:
        token = users.issue_token(conn, str(user["id"]), "reset_password", RESET_PASSWORD_TTL)
        emails.send_password_reset_email(user["email"], emails.display_name(user), token)
    # Same response whether or not the address is registered
    return {
        "success": True,
        "message": f"{body.email} が登録済みの場合、パスワード再設定用のメールをお送りしました。",
    }


@router.post("/reset-password", response_model=MessageOut)
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
        emails.send_password_changed_email(updated["email"], emails.display_name(updated))
    return {"success": True, "message": "パスワードを再設定しました。新しいパスワードでログインしてください。"}
