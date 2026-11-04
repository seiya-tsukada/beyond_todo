"""Application settings loaded from environment variables.

APP_ENV selects how the app behaves:

- ``production``: Vercel deployments (Production and Preview). Picked automatically
  when Vercel's ``VERCEL_ENV`` is present. E-mails go out through Resend, cookies
  are always Secure, and required variables are checked at startup.
- ``local``: docker compose / local development (the default elsewhere).
  Notifications are not sent; their content is written to the API log instead.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from typing import Literal
from zoneinfo import ZoneInfo

AppEnv = Literal["local", "production"]
APP_ENVS: tuple[AppEnv, ...] = ("local", "production")


def _bool(value: str | None, default: bool) -> bool:
    if value is None or value == "":
        return default
    return value.strip().lower() in ("1", "true", "yes", "on")


def _app_env() -> AppEnv:
    explicit = (os.environ.get("APP_ENV") or "").strip().lower()
    if explicit:
        if explicit not in APP_ENVS:
            raise RuntimeError(f"APP_ENV must be one of {', '.join(APP_ENVS)} (got {explicit!r})")
        return explicit  # type: ignore[return-value]
    return "production" if os.environ.get("VERCEL_ENV") else "local"


@dataclass(frozen=True)
class Settings:
    app_env: AppEnv
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

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def notifications_enabled(self) -> bool:
        """Notifications are only delivered in production; locally they are logged."""
        return self.is_production


def _validate_production(s: Settings) -> None:
    missing = [
        name
        for name, value in (
            ("DATABASE_URL", s.database_url),
            ("RESEND_API_KEY", s.resend_api_key),
            ("MAIL_FROM", os.environ.get("MAIL_FROM")),
            ("CRON_SECRET", s.cron_secret),
            ("APP_URL", os.environ.get("APP_URL")),
        )
        if not value
    ]
    problems = [f"missing {', '.join(missing)}"] if missing else []
    if s.app_url and not s.app_url.startswith("https://"):
        problems.append("APP_URL must be an https:// URL")
    if problems:
        raise RuntimeError(f"Invalid production configuration (APP_ENV=production): {'; '.join(problems)}")


@lru_cache
def get_settings() -> Settings:
    app_env = _app_env()
    production = app_env == "production"
    settings = Settings(
        app_env=app_env,
        database_url=os.environ.get("DATABASE_URL", ""),
        app_url=os.environ.get("APP_URL", "" if production else "http://localhost:5173").rstrip("/"),
        # Production always uses Secure cookies; locally it defaults to true as well
        # but can be turned off for browsers that reject Secure cookies over http.
        cookie_secure=True if production else _bool(os.environ.get("COOKIE_SECURE"), True),
        session_ttl_days=int(os.environ.get("SESSION_TTL_DAYS", "30")),
        timezone=ZoneInfo(os.environ.get("APP_TIMEZONE", "Asia/Tokyo")),
        resend_api_key=os.environ.get("RESEND_API_KEY") or None,
        mail_from=os.environ.get("MAIL_FROM", "Beyond TODO. <noreply@example.com>"),
        gemini_api_key=os.environ.get("GEMINI_API_KEY") or None,
        gemini_model=os.environ.get("GEMINI_MODEL", "gemini-3.8-flash"),
        cron_secret=os.environ.get("CRON_SECRET") or None,
    )
    if production:
        _validate_production(settings)
    return settings
