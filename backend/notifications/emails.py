"""Notification e-mails. Each function builds one message and hands it to the mailer.

To add a new notification, add a function here that renders subject / text / HTML
and calls `send_email`.
"""

from __future__ import annotations

from html import escape
from urllib.parse import urlencode

from ..config import get_settings
from .mailer import EmailMessage, send_email

APP_NAME = "Beyond TODO."


def display_name(user: dict) -> str:
    """Name for greetings: the user's name, or the local part of the address (name is optional)."""
    return (user.get("name") or "").strip() or str(user["email"]).split("@")[0]


def _link(**params: str) -> str:
    return f"{get_settings().app_url}/?{urlencode(params)}"


def _layout(
    heading: str, paragraphs: list[str], button: tuple[str, str] | None = None, footer_note: str = ""
) -> str:
    body = "".join(f'<p style="margin:0 0 16px;line-height:1.7">{p}</p>' for p in paragraphs)
    if button:
        label, url = button
        body += (
            f'<p style="margin:24px 0"><a href="{escape(url)}" '
            'style="background:#18181b;color:#fff;padding:12px 20px;border-radius:8px;'
            f'text-decoration:none;font-weight:600;font-size:14px">{escape(label)}</a></p>'
        )
    return (
        '<div style="font-family:-apple-system,BlinkMacSystemFont,\'Hiragino Sans\',sans-serif;'
        'max-width:560px;margin:0 auto;padding:32px 24px;color:#18181b;font-size:14px">'
        f'<p style="font-weight:700;font-size:16px;margin:0 0 24px">{APP_NAME}</p>'
        f'<h1 style="font-size:18px;margin:0 0 16px">{escape(heading)}</h1>{body}'
        '<p style="margin:32px 0 0;font-size:12px;color:#71717a">'
        f"{escape(footer_note)}このメールは {APP_NAME} から自動送信されています。</p></div>"
    )


def send_signup_code_email(to: str, name: str, code: str) -> bool:
    return send_email(
        EmailMessage(
            to=to,
            subject=f"【{APP_NAME}】確認コード: {code}",
            text=f"{name} さん\n\n{APP_NAME} へのご登録ありがとうございます。\n"
            f"登録画面に次の確認コードを入力してください（10分間有効）。\n\n    {code}\n\n"
            "心当たりがない場合は、このメールを破棄してください。アカウントは有効になりません。\n",
            html=_layout(
                "確認コード",
                [
                    f"{escape(name)} さん、{APP_NAME} へのご登録ありがとうございます。",
                    "登録画面に次の確認コードを入力してください。コードの有効期限は10分です。",
                    '<span style="display:inline-block;font-family:ui-monospace,Menlo,monospace;'
                    "font-size:28px;font-weight:700;letter-spacing:8px;padding:12px 20px;"
                    f'background:#f4f4f5;border-radius:8px">{escape(code)}</span>',
                    "心当たりがない場合は、このメールを破棄してください。アカウントは有効になりません。",
                ],
            ),
        )
    )


def send_password_reset_email(to: str, name: str, token: str) -> bool:
    url = _link(reset_token=token)
    return send_email(
        EmailMessage(
            to=to,
            subject=f"【{APP_NAME}】パスワード再設定のご案内",
            text=f"{name} さん\n\nパスワード再設定のリクエストを受け付けました。\n"
            f"以下のリンクから新しいパスワードを設定してください（1時間有効）。\n\n{url}\n\n"
            "心当たりがない場合は、このメールを破棄してください。\n",
            html=_layout(
                "パスワードの再設定",
                [
                    f"{escape(name)} さん、パスワード再設定のリクエストを受け付けました。",
                    "以下のボタンから新しいパスワードを設定してください。リンクの有効期限は1時間です。",
                    "心当たりがない場合は、このメールを破棄してください。パスワードは変更されません。",
                ],
                ("パスワードを再設定する", url),
            ),
        )
    )


def send_password_changed_email(to: str, name: str) -> bool:
    url = _link(forgot="1")
    return send_email(
        EmailMessage(
            to=to,
            subject=f"【{APP_NAME}】パスワードが変更されました",
            text=f"{name} さん\n\nアカウントのパスワードが変更され、すべての端末からログアウトしました。\n"
            f"この操作に心当たりがない場合は、すぐに以下からパスワードを再設定してください。\n\n{url}\n",
            html=_layout(
                "パスワードが変更されました",
                [
                    f"{escape(name)} さん、アカウントのパスワードが変更され、すべての端末からログアウトしました。",
                    "この操作に心当たりがない場合は、すぐにパスワードを再設定してください。",
                ],
                ("パスワードを再設定する", url),
            ),
        )
    )


def send_weekly_review_reminder(
    to: str, name: str, *, week: str, completed: list[str], incomplete: list[str]
) -> bool:
    url = _link(tab="review")
    total = len(completed) + len(incomplete)
    progress = f"今週の最優先事項: {len(completed)} / {total} 件完了" if total else "今週の最優先事項は未設定です"
    text_items = "".join(f"\n  ✓ {t}" for t in completed) + "".join(f"\n  ・{t}" for t in incomplete)
    html_items = "".join(f"<li>✓ {escape(t)}</li>" for t in completed) + "".join(
        f"<li>{escape(t)}</li>" for t in incomplete
    )
    paragraphs = [
        f"{escape(name)} さん、今週（{escape(week)}）もお疲れさまでした。",
        "週の終わりに、8つの問いで1週間を振り返りましょう。他者の期待と自分の意思のバランスを見直し、来週の焦点を決める時間です。",
        escape(progress),
    ]
    if html_items:
        paragraphs.append(f'<ul style="margin:0;padding-left:20px;line-height:1.8">{html_items}</ul>')
    return send_email(
        EmailMessage(
            to=to,
            subject=f"【{APP_NAME}】今週の振り返りをしましょう（{week}）",
            text=f"{name} さん\n\n今週（{week}）もお疲れさまでした。\n"
            f"8つの問いで1週間を振り返りましょう。\n\n{progress}{text_items}\n\n{url}\n\n"
            "このリマインドは設定画面から停止できます。\n",
            html=_layout(
                "今週の振り返りをしましょう",
                paragraphs,
                ("振り返りを始める", url),
                footer_note="このリマインドは設定画面から停止できます。",
            ),
        )
    )
