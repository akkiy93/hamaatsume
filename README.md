# 🌊 浜あつめ

友達 10 人くらいで「○浜」とつく地名・人名・店名の写真を投稿し合う、猫あつめ風コレクション Web アプリ。

- **フロント**: Vite + React + TypeScript（GitHub Pages）
- **バックエンド**: Supabase（Postgres / Storage / Edge Functions）
- **認証**: 合言葉（Edge Function で検証 → Supabase セッション発行）
- **地図**: Leaflet + OpenStreetMap

## 機能

- 写真投稿（タイトル、ふりがな、種別、タグ、メモ、撮影日、位置情報）
- 投稿者名（ひとりが複数の名義を使える。過去に使った名義を選択可）
- タグクラウド・タグ/種別/全文での絞り込み
- 重複タイトル警告
- 地図ビュー（位置情報付き投稿をピン表示）
- 統計（種別・投稿者・タグ・人気投稿）
- ❤️ などの絵文字リアクション

---

## セットアップ

### 1. Supabase プロジェクトを作る

1. [Supabase](https://supabase.com/) で無料プロジェクトを作成
2. **Project URL** と **anon key** を控える（Settings → API）
3. SQL Editor で [`supabase/schema.sql`](./supabase/schema.sql) を実行
4. Auth → Providers → **Email** を有効化（デフォルトで ON）
5. Auth → URL Configuration → **Site URL** にデプロイ先 URL を設定

### 2. Edge Function（合言葉ログイン）をデプロイ

合言葉は**サーバーサイドにのみ置く**のがポイント。フロントに埋めると誰でも読めます。

```bash
# 初回のみ
npm i -g supabase
supabase login
supabase link --project-ref <your-ref>

# シークレットを設定（合言葉とサービスロールキー）
supabase secrets set \
  PASSPHRASE='ここに合言葉' \
  SB_URL='https://<your-ref>.supabase.co' \
  SB_SERVICE_ROLE_KEY='<service role key>'

# デプロイ（JWT 検証は不要なので --no-verify-jwt）
supabase functions deploy login --no-verify-jwt
```

### 3. ローカル開発

```bash
cp .env.example .env.local
# .env.local を編集して URL / anon key を入れる

npm install
npm run dev
# http://localhost:5173/ にアクセス
```

開発時はベースパスを `/` にしたいので、必要なら:

```bash
VITE_BASE=/ npm run dev
```

### 4. GitHub Pages にデプロイ

1. リポジトリ Settings → **Pages** → Build and deployment を **GitHub Actions** に
2. リポジトリ Settings → **Secrets and variables → Actions** に以下を登録:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. `main` に push すると `.github/workflows/deploy.yml` が走ってデプロイされる
4. デプロイ URL を Supabase の **Site URL** に設定

> ベースパスは `vite.config.ts` で `/hamaatsume/` にしています。リポジトリ名を変えた場合はここも更新してください。

---

## ディレクトリ

```
supabase/
  schema.sql                 # テーブル・RLS・Storage バケットの定義
  functions/login/index.ts   # 合言葉 → Supabase セッション
src/
  lib/                       # Supabase クライアント、認証、画像処理
  pages/                     # Login, Gallery, NewPost, PostDetail, MapView, Stats
```

## 運用メモ

- 合言葉を変えたくなったら `supabase secrets set PASSPHRASE=...` で上書きして再デプロイ
- 参加者を追放したい場合は Supabase ダッシュボードの Auth → Users で削除
- Storage の `photos` バケットは public 読み取り。秘匿写真には向きません
