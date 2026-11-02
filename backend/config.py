"""Application settings loaded from environment variables."""

from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from zoneinfo import ZoneInfo


def _bool(value: str | None, default: bool) -> bool:
    if value is None or value == "":
        return default
    return value.strip().lower() in ("1", "true", "yes", "on")


@dataclass(frozen=True)
class Settings:
    database_url: str
    app_url: str
    cookie_secure: bool
    session_ttl_days: int
    timezone: ZoneInfo
    resend_api_key: str | None
    mail_from: str
    gemini_api_key: str | None
    gemini_model: str
    cron_secret: str | None


@lru_cache
def get_settings() -> Settings:
    return Settings(
        database_url=os.environ.get("DATABASE_URL", ""),
        app_url=os.environ.get("APP_URL", "http://localhost:5173").rstrip("/"),
        cookie_secure=_bool(os.environ.get("COOKIE_SECURE"), True),
        session_ttl_days=int(os.environ.get("SESSION_TTL_DAYS", "30")),
        timezone=ZoneInfo(os.environ.get("APP_TIMEZONE", "Asia/Tokyo")),
        resend_api_key=os.environ.get("RESEND_API_KEY") or None,
        mail_from=os.environ.get("MAIL_FROM", "Beyond TODO. <noreply@example.com>"),
        gemini_api_key=os.environ.get("GEMINI_API_KEY") or None,
        gemini_model=os.environ.get("GEMINI_MODEL", "gemini-3.8-flash"),
        cron_secret=os.environ.get("CRON_SECRET") or None,
    )
