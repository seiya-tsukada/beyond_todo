"""Uniform JSON error responses: {"error": "<message>"}."""

from __future__ import annotations

import logging
from collections.abc import Sequence
from typing import Any

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
}


def _validation_message(errors: Sequence[Any]) -> str:
    for error in errors:
        loc = error.get("loc", ())
        field = loc[-1] if loc else None
        if field in _FIELD_MESSAGES:
            return _FIELD_MESSAGES[field]
    return "入力内容に誤りがあります。"


def install_error_handlers(app: FastAPI) -> None:
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
