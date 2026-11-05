import pytest

from backend.config import get_settings

PROD_ENV = {
    "DATABASE_URL": "postgresql://example/db",
    "RESEND_API_KEY": "re_test",
    "MAIL_FROM": "Beyond TODO. <noreply@example.com>",
    "CRON_SECRET": "secret",
    "APP_URL": "https://beyond-todo.example.com",
}


@pytest.fixture
def env(monkeypatch):
    for name in (
        "APP_ENV", "VERCEL_ENV", "VERCEL_URL", "VERCEL_PROJECT_PRODUCTION_URL",
        "COOKIE_SECURE", "DATA_BACKEND", "MAIL_BACKEND", "DEMO_LOGIN", *PROD_ENV,
    ):
        monkeypatch.delenv(name, raising=False)
    get_settings.cache_clear()
    yield monkeypatch
    get_settings.cache_clear()


def test_defaults_to_local_without_notifications(env):
    s = get_settings()
    assert s.app_env == "local"
    assert not s.notifications_enabled


def test_vercel_is_production(env):
    for name, value in PROD_ENV.items():
        env.setenv(name, value)
    env.setenv("VERCEL_ENV", "preview")
    env.setenv("COOKIE_SECURE", "false")
    s = get_settings()
    assert s.app_env == "production"
    assert s.notifications_enabled
    assert s.cookie_secure  # always Secure in production


def test_production_requires_config(env):
    env.setenv("APP_ENV", "production")
    env.setenv("DATA_BACKEND", "postgres")
    env.setenv("MAIL_BACKEND", "resend")
    env.setenv("APP_URL", "http://insecure.example.com")
    with pytest.raises(RuntimeError, match="DATABASE_URL.*RESEND_API_KEY.*APP_URL must be an https"):
        get_settings()


def test_vercel_without_any_config_falls_back_to_mocks(env):
    env.setenv("VERCEL_ENV", "production")
    env.setenv("VERCEL_PROJECT_PRODUCTION_URL", "beyond-todo.vercel.app")
    s = get_settings()
    assert (s.app_env, s.data_backend, s.mail_backend) == ("production", "mock", "log")
    assert s.cron_secret is None


def test_production_with_mocks_needs_no_db_or_resend(env):
    env.setenv("VERCEL_ENV", "production")
    env.setenv("VERCEL_PROJECT_PRODUCTION_URL", "beyond-todo.vercel.app")
    env.setenv("CRON_SECRET", "secret")
    env.setenv("DATA_BACKEND", "mock")
    env.setenv("MAIL_BACKEND", "log")
    s = get_settings()
    assert (s.data_backend, s.mail_backend) == ("mock", "log")
    assert not s.notifications_enabled
    assert s.app_url == "https://beyond-todo.vercel.app"  # derived from Vercel's env


def test_invalid_backend(env):
    env.setenv("DATA_BACKEND", "sqlite")
    with pytest.raises(RuntimeError, match="DATA_BACKEND"):
        get_settings()


def test_invalid_app_env(env):
    env.setenv("APP_ENV", "staging")
    with pytest.raises(RuntimeError, match="APP_ENV"):
        get_settings()


def test_local_does_not_send_email(env, monkeypatch):
    import resend

    from backend.notifications.mailer import EmailMessage, send_email

    env.setenv("RESEND_API_KEY", "re_real_key")
    monkeypatch.setattr(resend.Emails, "send", lambda *_: pytest.fail("must not send locally"))
    assert send_email(EmailMessage(to="a@example.com", subject="s", html="<p>h</p>", text="t"))


def test_demo_login_defaults_on_and_can_be_turned_off(env):
    assert get_settings().demo_login
    env.setenv("DEMO_LOGIN", "false")
    get_settings.cache_clear()
    assert not get_settings().demo_login
