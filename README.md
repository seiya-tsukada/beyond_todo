# Beyond TODO.

自分の意思で、人生を動かす。課題・最優先事項・興味関心・ステークホルダーの期待を統合管理するパーソナルマネジメントツール。

## 構成

| 領域 | 技術 | 場所 |
| --- | --- | --- |
| ホスティング | Vercel（静的配信 + Python Functions + Cron） | `vercel.json` |
| フロントエンド | React + TypeScript + Vite + Tailwind CSS | `src/` |
| バックエンド | Python / FastAPI | `backend/`（エントリ: `api/index.py`） |
| DB | Supabase PostgreSQL（`beyond_todo` スキーマ） | `supabase/migrations/` |
| 認証 | 独自実装（Argon2id + httpOnly セッション Cookie。Supabase Auth 不使用） | `backend/routers/auth.py` |
| 通知 | Resend によるメール | `backend/notifications/` |
| AI | Gemini（未設定時はルールベース） | `backend/services/insights.py` |

```
api/index.py                 Vercel Function エントリ（/api/* はすべてここへ rewrite）
backend/
  main.py                    FastAPI アプリ、CSRF（同一オリジン）チェック
  config.py / db.py          環境変数 / psycopg 接続（1リクエスト=1トランザクション）
  routers/                   auth・workspace（CRUD）・overview（ダッシュボード/AI/エクスポート）・cron
  repositories/              SQL（すべて user_id でスコープ）
  services/                  優先事項の上限、メモ変換・自動ストック、AIインサイト
  notifications/             メール本文と Resend 送信
  tests/                     Postgres を使った結合テスト
src/
  services/api.ts            API クライアント（Cookie 認証）
  components/                画面
supabase/migrations/         DB スキーマ
```

### 主な仕様

- 最優先事項は **週あたり未完了5件まで**（`backend/services/priorities.py` と `src/constants.ts`）。
- 週は **ISO 週（Asia/Tokyo）** で計算します（例: `2026-W45`）。
- メール通知
  - 新規登録時のメールアドレス確認（24時間有効）
  - パスワード再設定（1時間有効）／再設定完了のセキュリティ通知
  - 週次レビューのリマインド: 日曜 18:00 JST（Vercel Cron `0 9 * * 0` UTC）。メール確認済み・設定でON・その週の振り返り未作成のユーザーにのみ送信し、同じ週に二重送信しません。
- ダッシュボード表示時はルールベースのインサイト、「再分析」ボタンで Gemini を呼び出します。

## 本番セットアップ

### 1. Supabase

1. `supabase/migrations/*.sql` を SQL Editor で実行（または `supabase db push`）。
2. Project Settings → Database → Connection string の **Transaction pooler**（ポート 6543）を `DATABASE_URL` に設定。
3. `beyond_todo` スキーマは API（PostgREST）に公開しないでください（Exposed schemas に追加不要）。

### 2. 環境変数（Vercel / Docker を使わないローカル実行）

`.env.example` を `.env.local` にコピーして値を設定します。Vercel には同じ変数を Project Settings → Environment Variables に設定してください（`APP_URL` は本番URL、`CRON_SECRET` は十分に長いランダム文字列）。

## ローカル開発（Docker Compose・推奨）

外部サービスはすべてローカルの代替に置き換わるため、アカウントやキーなしで一通り動きます。

```bash
docker compose up --build
```

| URL | 内容 |
| --- | --- |
| http://localhost:5173 | アプリ（`/api` は API コンテナへプロキシ） |
| http://localhost:5173/api/docs | API ドキュメント（FastAPI） |
| http://localhost:8025 | Mailpit：送信されたメールの確認（確認リンク・再設定リンクもここから開けます） |
| `localhost:54322` | Postgres（user / password: `postgres`、DB: `beyond_todo`） |

| 本番の依存 | ローカルでの代替 |
| --- | --- |
| Supabase Postgres | `db`（postgres:17）。`migrate` が `supabase/migrations` の未適用分を起動時に適用 |
| Resend | `resend-mock`（Resend API 互換のモック）→ `mailpit` へ SMTP 転送。アプリ側は本番と同じ Resend SDK 経由で送信 |
| Gemini | キー未設定のためルールベースのインサイト（`GEMINI_API_KEY` を渡せば実 API） |
| Vercel Cron | 手動実行（下記） |

- `src/` と `backend/` の変更は自動で反映されます（Vite HMR / uvicorn reload）。
- `package.json` や `requirements*.txt` を変えたら `docker compose up --build` で再ビルドしてください。
- ポートが衝突する場合は `WEB_PORT` / `MAIL_UI_PORT` / `DB_PORT` で変更できます（例: `WEB_PORT=5174 docker compose up`）。

よく使うコマンド:

```bash
curl -H "Authorization: Bearer local-cron-secret" http://localhost:5173/api/cron/weekly-review-reminder
```

```bash
docker compose run --rm --no-deps -e TEST_DATABASE_URL=postgresql://postgres:postgres@db:5432/beyond_todo_test api python -m pytest backend/tests
```

```bash
docker compose down -v
```

1つ目は週次リマインドの手動実行、2つ目はバックエンドの結合テスト（専用DB `beyond_todo_test` を使用し、開発データには触れません）、3つ目はDBを含めた全データの削除です。

## ローカル開発（Docker なし）

```bash
npm install
```

```bash
uv venv --python 3.12 .venv && uv pip install --python .venv/bin/python -r requirements-dev.txt
```

`.env.local` の `DATABASE_URL` に Postgres を用意したうえで、API（ポート 8000、`API_PORT` で変更可）とフロント（ポート 5173）を別々に起動します。

```bash
npm run dev:api
```

```bash
npm run dev
```

`RESEND_API_KEY` 未設定の場合、メールは送信されず API のログに出力されます。

## テスト・チェック

```bash
npm run lint
```

```bash
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:54322/beyond_todo_test npm run test:api
```

（2つ目は Docker Compose の DB を使って、ホストの venv からテストする場合）

## 開発フロー（ブランチ戦略）

GitHub Flow + Vercel Preview を基本にします。

- `main` は常にデプロイ可能な状態に保ち、Vercel の Production に自動デプロイ。直接 push はしない（Branch protection で PR 必須にする）。
- 作業は `main` から短命ブランチを切る。命名: `feat/…`（機能）, `fix/…`（不具合）, `chore/…`（設定・依存・環境）, `docs/…`, `refactor/…`。
- PR ごとに Vercel の Preview Deployment で動作確認。Preview 用の環境変数（別の Supabase プロジェクト or ブランチ、Resend のテスト送信元など）は Vercel の Preview 環境に分けて設定し、本番データに触れないようにする。
- マージは Squash merge、マージ後はブランチを削除。
- DB 変更は `supabase/migrations/` に新しいファイルを追加する形で行い（既存ファイルは書き換えない）、本番への適用はマージ後に `supabase db push`（将来的には CI から）。
- 本番とは別に常設の検証環境が必要になった段階で、`develop` ブランチではなく「Vercel Preview + Supabase Branching」での検証を優先し、ブランチ構成はシンプルに保つ。

## デプロイ

Vercel にリポジトリを接続すれば、`vercel.json` に従って `dist/` の静的配信、`api/index.py` の Python Function、週次 Cron が構成されます。
