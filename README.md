# ガントチャート

担当者ごとに「いつ・どの案件を作業しているか」を一目で確認・編集できる、シンプルなガントチャートサイト。身内での利用を想定している。

- 左: 担当者（親）→ 案件（子）の 2 階層リスト。右: 日単位のタイムラインに、案件の期間を帯で表示する
- 帯のクリック、または「案件を追加」で右にサイドパネルを開き、案件を追加・編集・削除する
- 帯のドラッグで期間の移動・伸縮、左リストのつかみのドラッグで案件の並び替え
- 案件の完了（ガントチャートから非表示にする。ヘッダー右上のボタンで表示も可能）
- 担当者の追加・名前の変更・並び替え・削除
- 土日祝の色分け、今日の線、PWA としてのインストール、Basic 認証

データは今のところブラウザの localStorage に保存する（Firestore への移行を前提にした `IGanttRepository` 経由のアクセス）。ブラウザや端末が違うとデータは共有されない。

## 必要なもの

| 項目    | バージョン                                                               |
| ------- | ------------------------------------------------------------------------ |
| Node.js | 24 以上                                                                  |
| pnpm    | 11 以上（`package.json` の `devEngines` で 11.5.2 を指定）               |
| mkcert  | HTTPS で開発するとき（`pnpm dev`）だけ。未導入なら `brew install mkcert` |

**pnpm 以外は使えない。** `npm install` / `yarn` は `preinstall` で止まる。一時的なコマンドの実行は `pnpm dlx` を使う。

## セットアップ

```bash
pnpm install
```

次に、Basic 認証の ID とパスワードを `.env.local` に書く（コミットされない。ひな形は `.env.example`）。

```bash
cp .env.example .env.local
```

```
BASIC_AUTH_USER=好きな ID
BASIC_AUTH_PASSWORD=好きなパスワード
```

- 開発環境（`pnpm dev` / `pnpm dev:http`）で未設定のときは、認証なしで開く
- **本番（`pnpm build` → `pnpm start`）で未設定のときは、すべてのアクセスを 401 で拒否する**（設定し忘れて公開するのを防ぐため）
- manifest とアイコンは PWA のインストール判定のため、認証の対象外にしている

## 起動

```bash
pnpm dev
```

`https://localhost:3000` で開く（HTTPS。初回は mkcert の証明書を `certificates/` に作る）。

mkcert を入れていないときや、認証なしで手早く確認したいときは HTTP で起動する。

```bash
pnpm dev:http
```

`http://localhost:3000` で開く。`.env.local` に認証情報があると 401 になるので、認証なしで開きたいときは次のように環境変数を空にして起動する。

```bash
BASIC_AUTH_USER= BASIC_AUTH_PASSWORD= pnpm dev:http
```

- 担当者が 0 人の空の画面には、開発用に「サンプルデータを入れる」ボタンが出る（本番ビルドでは出ない）。やり直すときは、ブラウザの localStorage の `gantt:*` を消す
- スマホ実機など、`localhost` 以外から開くときは `pnpm dev`（HTTPS）を使う。HTTP だと ID の生成（`crypto.randomUUID()`）が使えず、担当者・案件を追加できない

### 本番ビルドの確認

```bash
pnpm build
pnpm start
```

`http://localhost:3000` で開く。PWA のインストールと Service Worker の登録は、本番ビルドでだけ動く（`localhost` なら HTTP でも可）。

## コマンド

| コマンド            | 内容                                                           |
| ------------------- | -------------------------------------------------------------- |
| `pnpm dev`          | 開発サーバーを HTTPS で起動（`https://localhost:3000`）        |
| `pnpm dev:http`     | 開発サーバーを HTTP で起動（`http://localhost:3000`）          |
| `pnpm build`        | 本番ビルド                                                     |
| `pnpm start`        | 本番ビルドの起動                                               |
| `pnpm lint`         | ESLint                                                         |
| `pnpm typecheck`    | 型チェック（`next typegen` で型を生成してから `tsc --noEmit`） |
| `pnpm test`         | Vitest による単体テスト                                        |
| `pnpm test:watch`   | Vitest をウォッチモードで実行                                  |
| `pnpm format`       | Prettier で整形                                                |
| `pnpm format:check` | Prettier の整形チェック（書き換えない）                        |

## 技術構成

Next.js 16（App Router、`src/` 構成）/ TypeScript（strict）/ Sass + CSS Modules / date-fns / `@holiday-jp/holiday_jp`（祝日）/ react-day-picker（カレンダー）/ Vitest / ESLint / Prettier

- ガントチャートの実装は `src/features/gantt/` に集約している（コンポーネント・フック・型・定数・repository）
- Basic 認証は `src/proxy.ts`（Next.js 16 では `middleware.ts` ではなく `proxy.ts`）
- PWA は `src/app/manifest.ts` と `public/sw.js`。アイコンは `node scripts/generate-icons.mjs` で作り直せる

## 開発のルール

AI エージェントを含む開発者向けの規約は [AGENTS.md](AGENTS.md)（Claude Code は [CLAUDE.md](CLAUDE.md) 経由）に、要件と実装プランは `.plan/` にある。`.plan/handoff.md` に現在の進捗と調査済みの事実をまとめている。
