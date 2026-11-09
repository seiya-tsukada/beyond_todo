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
| 通知 | Resend によるメール（`MAIL_BACKEND=resend`。ローカルの既定はログ出力） | `backend/notifications/` |
| AI | Gemini（未設定時はルールベース） | `backend/services/insights.py` |

```
api/index.py                 Vercel Function エントリ（/api/* はすべてここへ rewrite）
backend/
  main.py                    FastAPI アプリ、CSRF（同一オリジン）チェック
  config.py / db.py          環境変数 / psycopg 接続（1リクエスト=1トランザクション）
  routers/                   auth・workspace（CRUD）・overview（ダッシュボード/AI/エクスポート）・cron
  repositories/              データアクセス（DATA_BACKEND で実装を選択）
    postgres/                SQL（すべて user_id でスコープ）
    mock/                    固定のサンプルデータを返すモック（保存しない）
  services/                  優先事項の上限、メモ変換・自動ストック、AIインサイト
  notifications/             メール本文と Resend 送信
  tests/                     Postgres を使った結合テスト
src/
  services/api.ts            API クライアント（Cookie 認証）
  components/                画面
supabase/migrations/         DB スキーマ
```

### 主な仕様

- 最優先事項は **週あたり未完了5件まで**（`backend/services/priorities.py` と `src/constants.ts`）。DB でもトリガーで担保し、同時作成でも超えません。
- 課題・最優先事項・ステークホルダーへの紐付けは複合外部キー `(id, user_id)` により同一ユーザー内に限定されます。
- レスポンスの形は `backend/schemas.py` の `*Out` モデル（`src/types/index.ts` と対応）、リポジトリの共通インターフェースは `backend/repositories/base.py` です。
- 週は **ISO 週（Asia/Tokyo）** で計算します（例: `2026-W45`）。
- メール通知
  - 新規登録時のメールアドレス確認（24時間有効）
  - パスワード再設定（1時間有効）／再設定完了のセキュリティ通知
  - 週次レビューのリマインド: 日曜 18:00 JST（Vercel Cron `0 9 * * 0` UTC）。メール確認済み・設定でON・その週の振り返り未作成のユーザーにのみ送信し、同じ週に二重送信しません。同じジョブで期限切れのセッションと使用済み・期限切れのトークンを削除します。
- DB キープアライブ: 毎日 03:00 JST（Vercel Cron `0 18 * * *` UTC）に `/api/cron/keepalive` が読み取り専用の軽いクエリを1回実行し、Supabase 無料プランの非アクティブによる一時停止を防ぎます。READ ONLY トランザクション・5秒タイムアウトで、データの変更やメール送信は行いません（`DATA_BACKEND=mock` では何もしません）。
- ダッシュボード表示時はルールベースのインサイト、「再分析」ボタンで Gemini を呼び出します。

## 環境構成（dev / production）

環境は dev（ローカル開発）と production（Vercel 本番）の2つだけです。Vercel の Preview Deployment は使いません。
バックエンドは `APP_ENV` で動作を切り替えます（dev は `APP_ENV=local`）。

| | dev（ローカル） | production（本番） |
| --- | --- | --- |
| 起動方法 | `docker compose up --build` | `main` へのマージで Vercel に自動デプロイ |
| `APP_ENV` | `local`（`compose.yaml` で指定。Vercel 外での既定値） | `production`（Vercel が入れる `VERCEL_ENV` で自動判定。設定不要） |
| フロントエンド | Vite 開発サーバー（`web` コンテナ、HMR） | `npm run build` の `dist/` を静的配信 |
| API | uvicorn `--reload`（`api` コンテナ） | Vercel Python Function（`api/index.py`） |
| DB | Docker の Postgres 17（`db` コンテナ、データはボリューム） | Supabase PostgreSQL（Transaction pooler） |
| スキーマ | 起動時に `migrate` が `supabase/migrations` の未適用分を自動適用 | マージ後に `supabase db push` で適用 |
| メール通知 | 送信しない（API ログに出力） | Resend で送信 |
| Cookie | `COOKIE_SECURE`（compose では `false`） | 常に `Secure`（`COOKIE_SECURE` は無視） |
| Cron | 手動で curl（下記） | Vercel Cron（`vercel.json`） |
| AI インサイト | 既定はルールベース（`GEMINI_API_KEY` を渡せば Gemini） | Gemini（未設定ならルールベース） |
| 環境変数 | `compose.yaml` に記載済み（`.env` 不要） | Vercel の Environment Variables（Production） |
| 設定漏れ | — | 必須変数が欠けていると起動時にエラーで停止 |

## 本番セットアップ

### 1. Supabase

1. スキーマを作成する（下記「DB の初期化（Supabase + psql）」）。
2. Project Settings → Database → Connection string の **Transaction pooler**（ポート 6543）を `DATABASE_URL` に設定。
3. `beyond_todo` スキーマは API（PostgREST）に公開しないでください（Exposed schemas に追加不要）。

### DB の初期化（Supabase + psql）

Supabase の接続文字列（Project Settings → Database → Connection string の **Session pooler**、ポート 5432）を使い、ローカルから次の1行で全マイグレーションを適用します。

```bash
cat supabase/migrations/*.sql | psql "<Session pooler の接続文字列>" -v ON_ERROR_STOP=1 -1
```

- `-1` で全体を1トランザクションで実行するため、途中で失敗しても何も変更されません。
- マイグレーションは冪等（既にあるテーブル・制約・インデックスはスキップ）なので、適用済みの DB に再実行しても何も変わりません。追加したマイグレーションだけを反映したいときも同じコマンドで構いません。
- `supabase db push --db-url "<同じ URL>"` でも適用できます（こちらは適用履歴を `supabase_migrations.schema_migrations` に記録します）。
- パスワードに記号が含まれる場合は URL エンコードしてください。以降のコマンドは `export DATABASE_URL="<同じ URL>"` しておくと `"$DATABASE_URL"` で書けます。

### メンテナンス用 SQL（`supabase/maintenance/`）

`supabase/migrations/` の外に置いているため、`supabase db push` やローカルの `migrate` では実行されません。手動で `psql` から使います。

| ファイル | 内容 | 実行例 |
| --- | --- | --- |
| `row_counts.sql` | 全テーブルの行数（読み取りのみ） | `psql "$DATABASE_URL" -f supabase/maintenance/row_counts.sql` |
| `purge_expired.sql` | 期限切れセッション・期限切れ/使用済みトークンを削除（週次 Cron と同じ処理） | `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/maintenance/purge_expired.sql` |
| `delete_user.sql` | 指定ユーザーと、その全データを削除 | `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v email=someone@example.com -f supabase/maintenance/delete_user.sql` |
| `truncate_data.sql` | **全データを削除**（テーブル・制約・トリガーは残す） | `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v confirm=yes -f supabase/maintenance/truncate_data.sql` |
| `drop_schema.sql` | **`beyond_todo` スキーマごと削除** | 下記の作り直しで使用 |

スキーマを作り直す（全削除 → 全マイグレーション適用を1トランザクションで実行）:

```bash
cat supabase/maintenance/drop_schema.sql supabase/migrations/*.sql | psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v confirm=yes -1
```

- `truncate_data.sql` と `drop_schema.sql` は `-v confirm=yes` がないとエラーで止まります（本番データの誤削除防止）。
- 作り直しても適用されるマイグレーションは同じなので、`supabase db push` の適用履歴とは食い違いません。
- ローカル（docker compose）の DB にも同じファイルが使えます（`DATABASE_URL=postgresql://postgres:postgres@localhost:54322/beyond_todo`）。

### 2. 環境変数（Vercel）

Vercel の Project Settings → Environment Variables（Production）に `.env.example` の変数を設定します。`APP_ENV` は設定不要です。

| 変数 | 必須 | 内容 |
| --- | --- | --- |
| `DATA_BACKEND` | | `postgres` または `mock`（DB を使わず固定データを返す）。未設定なら `DATABASE_URL` があれば `postgres`、なければ `mock` |
| `MAIL_BACKEND` | | `resend` または `log`（送信せずログ出力）。未設定なら `RESEND_API_KEY` があれば `resend`、なければ `log` |
| `DEMO_LOGIN` | | `true`（既定）ならログイン画面に「ログインをスキップ」を表示し、共用のデモユーザー（demo@example.com）で入れる。本運用前に `false` にする |
| `DATABASE_URL` | ○※ | Supabase の Transaction pooler（ポート 6543）の接続文字列。※`DATA_BACKEND=mock` なら不要 |
| `RESEND_API_KEY` / `MAIL_FROM` | ○※ | Resend の API キーと送信元。※`MAIL_BACKEND=log` なら不要 |
| `CRON_SECRET` | | 十分に長いランダム文字列（Vercel Cron の認証）。未設定の間は週次リマインドとキープアライブの Cron が動きません |
| `APP_URL` | | 本番URL（`https://` 必須。メール内リンクに使用）。未設定なら Vercel のデプロイ URL（`VERCEL_PROJECT_PRODUCTION_URL`）を使用 |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | | 未設定ならルールベースのインサイト |
| `SESSION_TTL_DAYS` / `APP_TIMEZONE` | | 既定値: `30` / `Asia/Tokyo` |

`DATA_BACKEND=postgres` / `MAIL_BACKEND=resend` を明示したのに対応する変数が欠けていると、API は起動時に `Invalid production configuration` で停止します（設定漏れのまま動かないようにするため）。Vercel の Function ログで不足している変数名を確認できます。

### Supabase / Resend なしで先行デプロイする（モック）

Supabase と Resend の接続前は、環境変数を何も設定しなくてもデプロイして画面を確認できます（`DATABASE_URL` / `RESEND_API_KEY` がなければ自動で `mock` / `log` になります）。ログイン画面の「ログインをスキップ」からデモユーザーで入れます。

- `demo@example.com` / `demo-password` でログインできます（どのセッションもこのデモユーザーとして扱われます）。
- データは `backend/repositories/mock/_data.py` の固定データです。作成・更新・削除は成功レスポンスを返しますが保存されないため、再読み込みすると元に戻ります。新規登録も成功しますが、ログイン後はデモユーザーになります。
- メールは送信されず、内容が Vercel の Function ログに出ます。
- `GET /api/health` で `{"data": "mock", "mail": "log"}` のように現在のモードを確認できます。
- `GET /api/health` は DB に接続しない liveness です。DB への疎通（`select 1`）まで確認したい監視には `GET /api/health/ready` を使います（DB に届かなければ `503`、モックでは `{"db": "skipped"}`）。

Supabase に切り替えるときは、`DATABASE_URL` を設定して `DATA_BACKEND` を削除（または `postgres`）にします。Resend も同様に `RESEND_API_KEY` / `MAIL_FROM` を設定して `MAIL_BACKEND` を削除します。

## ローカル開発（Docker Compose・推奨）

`APP_ENV=local` で起動し、外部サービスのアカウントやキーなしで一通り動きます。

```bash
docker compose up --build
```

| URL | 内容 |
| --- | --- |
| http://localhost:5173 | アプリ（`/api` は API コンテナへプロキシ） |
| http://localhost:5173/api/docs | API ドキュメント（FastAPI） |
| `localhost:54322` | Postgres（user / password: `postgres`、DB: `beyond_todo`） |

| 本番の依存 | ローカルでの代替 |
| --- | --- |
| Supabase Postgres | `db`（postgres:17）。`migrate` が `supabase/migrations` の未適用分を起動時に適用 |
| Resend（メール通知） | 再現しない。送信内容は API ログに出力（`docker compose logs -f api`）。確認リンク・再設定リンクもログから開けます |
| Gemini | キー未設定のためルールベースのインサイト（`GEMINI_API_KEY` を渡せば実 API） |
| Vercel Cron | 手動実行（下記。送信対象の判定までは動き、メールはログ出力） |

- `src/` と `backend/` の変更は自動で反映されます（Vite HMR / uvicorn reload）。
- `package.json` や `requirements*.txt` を変えたら `docker compose up --build` で再ビルドしてください。
- ポートが衝突する場合は `WEB_PORT` / `DB_PORT` で変更できます（例: `WEB_PORT=5174 docker compose up`）。

よく使うコマンド:

```bash
curl -H "Authorization: Bearer local-cron-secret" http://localhost:5173/api/cron/weekly-review-reminder
```

```bash
docker compose run --rm --no-deps -e TEST_DATABASE_URL=postgresql://postgres:postgres@db:5432/beyond_todo_test api python -m pytest backend/tests
```

1つ目は週次リマインドの手動実行、2つ目はバックエンドの結合テスト（専用DB `beyond_todo_test` を使用し、開発データには触れません）です。

### DB データ（ボリューム）の扱い

dev の DB データは Docker の名前付きボリューム `beyond-todo_db-data` に保存されます（名前は `compose.yaml` の `name: beyond-todo` + `_db-data`）。実体は Docker ホストの次の場所です。

```
/var/lib/docker/volumes/beyond-todo_db-data/_data
```

macOS では Docker が Linux VM の中で動いているため、このパスは Mac のファイルシステムからは直接見えません（VM 内のパスです）。中身は `psql` で確認してください。

| 管理対象 | 保存先 | Git 管理 |
| --- | --- | --- |
| テーブル構造（スキーマ） | `supabase/migrations/*.sql` | される |
| ロール・テスト用 DB の作成 | `docker/db/init.sh`（ボリュームを初めて作成したときだけ実行） | される |
| 登録したユーザー・TODO などのデータ | ボリューム `beyond-todo_db-data` | されない（各自のマシンにのみ存在。seed データはなし） |

ボリュームのライフサイクル:

| 操作 | データ |
| --- | --- |
| `docker compose stop` / `docker compose down` / Docker・Mac の再起動 | 残る |
| `docker compose up --build`（イメージの再ビルド） | 残る |
| `supabase/migrations` に SQL を追加して `docker compose up` | 残る（未適用のマイグレーションだけが追加で適用される） |
| `docker compose down -v` / `docker volume rm beyond-todo_db-data` | **すべて削除**（次回起動時に空の DB から作り直し） |

DB に直接つなぐ:

```bash
docker compose exec db psql -U postgres -d beyond_todo
```

ホストのツール（TablePlus など）からは `localhost:54322`、user / password `postgres`、DB `beyond_todo` で接続できます。

バックアップと復元（作り直す前に残したいデータがある場合）:

```bash
docker compose exec -T db pg_dump -U postgres -d beyond_todo > backup.sql
```

```bash
docker compose exec -T db psql -U postgres -d beyond_todo < backup.sql
```

DB を作り直す（データを消して最初から）:

```bash
docker compose down -v
```

次のような場合に使います。

- `docker/db/init.sh` を変更した（ボリューム作成時にしか実行されないため）
- 既存のマイグレーションファイルを書き換えた（適用済みのものは再実行されないため。本来は新しいファイルを追加する）
- 開発データを空にしたい

`backup.sql` などのダンプにはローカルのデータが含まれるため、コミットしないでください。

## ローカル開発（Docker なし）

```bash
npm install
```

```bash
uv venv --python 3.12 .venv && uv pip install --python .venv/bin/python -r requirements-dev.txt
```

`.env.example` を `.env.local` にコピーし、`DATABASE_URL` に Postgres を用意したうえで、API（ポート 8000、`API_PORT` で変更可）とフロント（ポート 5173）を別々に起動します。

```bash
npm run dev:api
```

```bash
npm run dev
```

`.env.local` は `APP_ENV="local"` のままにしてください。メールは送信されず API のログに出力されます。

## テスト・チェック

```bash
npm run lint
```

```bash
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:54322/beyond_todo_test npm run test:api
```

（2つ目は Docker Compose の DB を使って、ホストの venv からテストする場合）

## 開発フロー（ブランチ戦略）

GitHub Flow を基本にします。検証は dev（docker compose）で行い、Vercel の Preview Deployment は使いません。

- `main` は常にデプロイ可能な状態に保ち、Vercel の Production に自動デプロイ。直接 push はしない（Branch protection で PR 必須にする）。
- 作業は `main` から短命ブランチを切る。命名: `feat/…`（機能）, `fix/…`（不具合）, `chore/…`（設定・依存・環境）, `docs/…`, `refactor/…`。
- PR の動作確認はローカルの docker compose で行う（テスト・`npm run lint` も通す）。
- マージは Squash merge、マージ後はブランチを削除。
- DB 変更は `supabase/migrations/` に新しいファイルを追加する形で行い（既存ファイルは書き換えない）、本番への適用はマージ後に `supabase db push` または上記の `psql` ワンライナー（将来的には CI から）。マイグレーションは再実行しても安全なように冪等に書く（`if not exists`、`create or replace`、制約・列の追加は存在チェック付きの `do` ブロック）。

## デプロイ

Vercel にリポジトリを接続すれば、`vercel.json` に従って `dist/` の静的配信、`api/index.py` の Python Function、週次リマインドと日次キープアライブの Cron が構成されます。
