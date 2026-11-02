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

## セットアップ

### 1. Supabase

1. `supabase/migrations/*.sql` を SQL Editor で実行（または `supabase db push`）。
2. Project Settings → Database → Connection string の **Transaction pooler**（ポート 6543）を `DATABASE_URL` に設定。
3. `beyond_todo` スキーマは API（PostgREST）に公開しないでください（Exposed schemas に追加不要）。

### 2. 環境変数

`.env.example` を `.env.local` にコピーして値を設定します。Vercel には同じ変数を Project Settings → Environment Variables に設定してください（`APP_URL` は本番URL、`CRON_SECRET` は十分に長いランダム文字列）。

### 3. ローカル開発

```bash
npm install
```

```bash
uv venv --python 3.12 .venv && uv pip install --python .venv/bin/python -r requirements-dev.txt
```

API（ポート 8000）とフロント（ポート 5173、`/api` を API へプロキシ）を別々に起動します。

```bash
npm run dev:api
```

```bash
npm run dev
```

`RESEND_API_KEY` 未設定の場合、メールは送信されず API のログに出力されます（確認リンクもログから開けます）。

### 4. テスト・チェック

```bash
npm run lint
```

バックエンドの結合テストは使い捨ての Postgres が必要です（`beyond_todo` スキーマを毎回作り直します）。

```bash
docker run -d --rm --name beyond-todo-test-pg -e POSTGRES_PASSWORD=test -p 54329:5432 postgres:17-alpine
```

```bash
TEST_DATABASE_URL=postgresql://postgres:test@localhost:54329/postgres npm run test:api
```

## デプロイ

Vercel にリポジトリを接続すれば、`vercel.json` に従って `dist/` の静的配信、`api/index.py` の Python Function、週次 Cron が構成されます。
