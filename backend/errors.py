"""Uniform JSON error responses: {"error": "<message>"}."""

from __future__ import annotations

import logging
from collections.abc import Sequence
from typing import Any

import psycopg.errors
from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


class AppError(Exception):
    def __init__(self, status_code: int, message: str):
        super().__init__(message)
        self.status_code = status_code
        self.message = message


def not_found(label: str) -> AppError:
    return AppError(404, f"指定された{label}が見つかりません。")


_FIELD_MESSAGES = {
    "email": "メールアドレスの形式が正しくありません。",
    "password": "パスワードは8文字以上で入力してください。",
    "name": "お名前を入力してください。",
    "title": "タイトルを入力してください（200文字以内）。",
    "summary": "週次サマリーを入力してください。",
    "decision": "意思決定内容を入力してください。",
    "reason": "理由を入力してください。",
    "content": "メモの内容を入力してください。",
    "code": "確認コードは6桁の数字で入力してください。",
}


def _validation_message(errors: Sequence[Any]) -> str:
    for error in errors:
        loc = error.get("loc", ())
        field = loc[-1] if loc else None
        if field in _FIELD_MESSAGES:
            return _FIELD_MESSAGES[field]
    return "入力内容に誤りがあります。"


# Database constraints that back up application checks. They only fire when a
# check was bypassed or lost a race, and map to the same message as the check.
def _priority_limit_message() -> str:
    from .services.priorities import capacity_message  # avoid import cycle

    return capacity_message()


_CONSTRAINT_ERRORS: dict[str, tuple[int, Any]] = {
    "users_email_lower_key": (400, "このメールアドレスは既に登録されています。"),
    "priorities_weekly_active_limit": (400, _priority_limit_message),
    "priorities_challenge_same_user_fkey": (400, "紐付ける課題が見つかりません。"),
    "decision_logs_priority_same_user_fkey": (404, "指定された優先事項が見つかりません。"),
    "stakeholder_interests_stakeholder_same_user_fkey": (404, "指定されたステークホルダーが見つかりません。"),
}


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(psycopg.errors.IntegrityError)
    async def _integrity_error(_: Request, exc: psycopg.errors.IntegrityError) -> JSONResponse:
        known = _CONSTRAINT_ERRORS.get(exc.diag.constraint_name or "")
        if known is None:
            logger.exception("Unhandled integrity error", exc_info=exc)
            return JSONResponse({"error": "サーバーでエラーが発生しました。"}, status_code=500)
        status, message = known
        return JSONResponse({"error": message() if callable(message) else message}, status_code=status)

    @app.exception_handler(AppError)
    async def _app_error(_: Request, exc: AppError) -> JSONResponse:
        return JSONResponse({"error": exc.message}, status_code=exc.status_code)

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        message = exc.detail if isinstance(exc.detail, str) else "リクエストに失敗しました。"
        return JSONResponse({"error": message}, status_code=exc.status_code)

    @app.exception_handler(RequestValidationError)
    async def _validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            {"error": _validation_message(exc.errors()), "details": jsonable_encoder(exc.errors())},
            status_code=400,
        )

    @app.exception_handler(Exception)
    async def _unexpected(_: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled error", exc_info=exc)
        return JSONResponse({"error": "サーバーでエラーが発生しました。"}, status_code=500)
