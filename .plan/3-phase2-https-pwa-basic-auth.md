# フェーズ 2: ローカル HTTPS・PWA・Basic 認証

- 全体プラン: [1-gantt-chart-mvp.md](1-gantt-chart-mvp.md)
- 担当: Sonnet 5.5
- ブランチ: `feat/pwa-basic-auth`
- 前提: フェーズ 1 が完了している

## 目的

`https://localhost:3000` で開け、Basic 認証がかかり、アプリとしてインストールできる状態にする。

## 確認済みの仕様（Next.js 16.4 同梱ドキュメントより）

- `middleware.ts` は廃止され、`src/proxy.ts`（`export function proxy`）に名前が変わっている（`03-api-reference/03-file-conventions/proxy.md`）
- `matcher` を指定しないと、`_next/static` や `public/` の画像にも proxy が走る
- `next dev --experimental-https` は mkcert で信頼済みの証明書を自動で作る（`03-api-reference/06-cli/next.md`）。mkcert は手元に入っていないが、Next.js が自動でダウンロードする想定。失敗した場合は `brew install mkcert` をユーザーに依頼する
- PWA の公式ガイド（`02-guides/progressive-web-apps.md`）は、`app/manifest.ts` と自前の Service Worker の組み合わせを紹介している。オフラインでのキャッシュまで必要な場合だけ Serwist を勧めている

## 方針の変更点（全体プランとの差分）

- **Serwist は使わない**。今回の PWA のスコープは「インストールしてアプリのウィンドウで起動できる」までで、オフラインキャッシュはスコープ外のため。公式ガイドどおり `app/manifest.ts` + 最小限の `public/sw.js` で対応する
- 将来オフラインに対応するときに Serwist を導入する（全体プランの「スコープ外」に追記する）

## 作業内容

### 1. ローカル HTTPS

- フェーズ 1 で `dev` スクリプトに `--experimental-https` を入れてある。初回起動時の証明書生成を確認する
- 生成される `certificates/` は `.gitignore` 済みであることを確認する

### 2. PWA

- `src/app/manifest.ts`: `name: "ガントチャート"`、`short_name`、`display: "standalone"`、`start_url: "/"`、`lang: "ja"`、`theme_color` / `background_color` はトークンの色に合わせる
- アイコン: `public/icons/icon-192.png` / `icon-512.png` / `icon-maskable-512.png`、`src/app/apple-icon.png`
  - アイコン画像はシンプルな図形（帯が並んだガントチャート風）を SVG で作り、PNG に書き出す。デザインに希望があればユーザーに確認する
- `public/sw.js`: install / activate で即時に有効化するだけの最小限の Service Worker。`fetch` はキャッシュせずネットワークにそのまま流す
- `src/app/ServiceWorkerRegister.tsx`（Client Component）: `navigator.serviceWorker.register("/sw.js")` を 1 回だけ実行し、`layout.tsx` に置く
  - 開発中に古い SW が残って混乱しないよう、登録は本番ビルドのときだけにするか検討する（`process.env.NODE_ENV`）
- `next.config.ts` の `headers()`: 公式ガイドどおり、`/sw.js` に `Cache-Control: no-cache, no-store, must-revalidate` と `Content-Type` を付ける。全体には `X-Content-Type-Options` / `X-Frame-Options` / `Referrer-Policy` を付ける

### 3. Basic 認証（`src/proxy.ts`）

- `Authorization: Basic xxx` ヘッダーを解析し、環境変数 `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD` と比べる
- 一致しなければ `401` と `WWW-Authenticate: Basic realm="gantt-chart", charset="UTF-8"` を返す
- 環境変数が未設定のとき
  - 開発環境（`NODE_ENV=development`）: 認証を省略して通す（ローカルでの作業を楽にするため）
  - 本番環境: **すべて拒否する**（設定し忘れて公開してしまうのを防ぐため）
- `matcher` で `_next/static` / `_next/image` / `favicon.ico` は除外する
  - `manifest.webmanifest` / `sw.js` / アイコンは**除外しない**。ブラウザは Basic 認証の資格情報を同じオリジンのリクエストで使い回すため、除外しなくてもインストールできる想定。うまくいかない場合だけ除外を検討する
- パスワードの比較は、文字列の `===` ではなく長さに依存しない比較にする（タイミング攻撃対策）
- 認証処理は `src/proxy.ts` の中で完結させる（proxy は他のモジュールに依存しない方がよい、とドキュメントにあるため）。解析と比較の関数は同じファイル内に分けて書き、Vitest でテストする
- `.env.example` に `BASIC_AUTH_USER=` / `BASIC_AUTH_PASSWORD=` を書いてコミットする。実際の値は `.env.local`（コミットしない）に置く

## 完了条件

- [ ] `pnpm dev` で `https://localhost:3000` が証明書の警告なしに開ける
- [ ] `.env.local` を設定すると Basic 認証のダイアログが出て、正しい ID とパスワードで開ける。間違えると 401 になる
- [ ] Chrome でアプリとしてインストールでき、アプリのウィンドウで起動する
- [ ] Basic 認証の解析・比較のテストが通る
- [ ] `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build` が成功する

## コミットの単位（目安）

1. `feat: Basic 認証を proxy で追加`
2. `feat: PWA の manifest とアイコン、Service Worker を追加`
3. `feat: セキュリティ関連のレスポンスヘッダーを追加`
