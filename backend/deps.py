"""Request dependencies: DB connection and the authenticated user."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import Depends, Request

from .db import Conn, get_conn
from .errors import AppError
from .repositories import users

SESSION_COOKIE = "bt_session"

# scope="function": commit before the response is sent, so the client never reads stale data
DbConn = Annotated[Conn, Depends(get_conn, scope="function")]


def get_current_user(request: Request, conn: DbConn) -> dict[str, Any]:
    token = request.cookies.get(SESSION_COOKIE)
    user = users.get_user_by_session(conn, token) if token else None
    # Sessions are only created after verification; this also shuts out sessions
    # of accounts that signed up before codes were required and never verified.
    if user is None or user["email_verified_at"] is None:
        raise AppError(401, "ログインが必要です。")
    return user


CurrentUser = Annotated[dict[str, Any], Depends(get_current_user)]


def user_id(user: dict[str, Any]) -> str:
    return str(user["id"])
