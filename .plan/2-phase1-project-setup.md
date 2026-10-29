# フェーズ 1: プロジェクトの土台作り

- 全体プラン: [1-gantt-chart-mvp.md](1-gantt-chart-mvp.md)
- 担当: Sonnet 5.5
- ブランチ: `feat/project-setup`（`main` から切る）
- 前提: なし（最初のフェーズ）

## 目的

Next.js のプロジェクトを動く状態にし、lint・型チェック・テスト・整形のコマンドを揃える。あわせて、pnpm 以外のパッケージマネージャーを使えないようにする。

## 現在の状態（2026-10-29 時点）

プラン作成の途中で、雛形の生成と依存の導入を一部先に進めてしまった。作業フォルダには次のファイルが**未コミット**で残っている。

- `create-next-app@16.4.3` が生成した `package.json` / `tsconfig.json` / `eslint.config.mjs` / `next.config.ts` / `pnpm-workspace.yaml` / `.gitignore` / `src/app/favicon.ico`
- 導入済みの依存: `date-fns` / `@holiday-jp/holiday_jp` / `sass` / `prettier` / `eslint-config-prettier` / `vitest` / `@types/node@24`
- これらを残して続きから進めるか、消して最初からやり直すかは、フェーズ開始前にユーザーへ確認する

## 作業内容

### 1. Next.js の雛形

- `pnpm dlx create-next-app@<最新>` で作る（TypeScript / App Router / `src/` / ESLint / Tailwind なし / import エイリアス `@/*`）
  - 作業フォルダが空ではないため、一時フォルダに生成してから必要なファイルだけコピーする
- 不要なサンプルを消す: `public/*.svg`、`page.module.css`、`globals.css`、`README.md` の雛形
- `src/app/layout.tsx`: `lang="ja"`、タイトルを「ガントチャート」にする。Google Fonts は使わない（オフライン・身内利用のため、システムフォントで十分）
- `src/app/page.tsx`: 仮の表示だけにする（中身はフェーズ 5 以降で作る）
- `next.config.ts`: 雛形の `cacheComponents: true` / `partialPrefetching: true` はそのまま残す

### 2. TypeScript

- `tsconfig.json` に `noUncheckedIndexedAccess: true` を追加する
- `target` を `ES2022` に上げる（`Array.prototype.at` などを使うため）

### 3. Sass の土台

- `src/styles/_tokens.scss`: 色・余白・フォントサイズ・角丸・影・z-index のトークンを Sass 変数と CSS カスタムプロパティで定義する
- `src/styles/globals.scss`: リセットとベーススタイル（`box-sizing`、`body` の背景・文字色、フォント）だけを書く
- `next.config.ts` の `sassOptions` で `src/styles` を読み込みパスに追加し、各 `*.module.scss` から `@use "tokens"` で読めるようにする（実装前に `node_modules/next/dist/docs/01-app/02-guides/sass.md` で書き方を確認する）

### 4. ESLint / Prettier

- `.prettierrc.json`: `{ "semi": false, "singleQuote": false, "trailingComma": "all" }`
- `.prettierignore`: `.next` / `node_modules` / `pnpm-lock.yaml` / `.plan`
- `eslint.config.mjs` の最後に `eslint-config-prettier` を追加し、整形のルールが ESLint とぶつからないようにする
- ESLint に `@typescript-eslint/no-explicit-any: "error"` を明示する

### 5. Vitest

- `vitest.config.ts`: `@/` エイリアスを `src/` に向ける。環境は `node`（localStorage のテストはフェーズ 3 で `jsdom` を追加するか、モックで済ませるかを決める）
- 動作確認用に `src/features/gantt/gantt.utils.test.ts` の空のテストは作らない。テストはフェーズ 3 以降で書き、このフェーズでは `pnpm test` が「テストなし」で正常終了することだけを確認する（`--passWithNoTests`）

### 6. package.json のスクリプト

```json
{
  "dev": "next dev --experimental-https",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "typecheck": "tsc --noEmit",
  "test": "vitest run --passWithNoTests",
  "test:watch": "vitest",
  "format": "prettier --write .",
  "format:check": "prettier --check ."
}
```

- `dev` の `--experimental-https` は、フェーズ 2 の確認対象だが、ここで先に入れておく

### 7. pnpm 以外を使えないようにする

次の仕組みを組み合わせる。どれか 1 つが効かなくても止まるようにする。

| 仕組み | 止められるもの | 設定 |
| --- | --- | --- |
| `devEngines.packageManager` | npm（v10.9 以降は `devEngines` を検査する） | `"devEngines": { "packageManager": { "name": "pnpm", "onFail": "error" } }` |
| `preinstall` スクリプト | npm / yarn の install | `"preinstall": "pnpm dlx only-allow pnpm"` |
| `packageManager` フィールド | Corepack 経由の yarn / 別バージョンの pnpm | 雛形で `pnpm@11.5.2` が入っている |
| `engines.pnpm` + `engineStrict` | 古いバージョンの pnpm | `"engines": { "node": ">=24", "pnpm": ">=11" }`、`pnpm-workspace.yaml` に `engineStrict: true` |
| `.gitignore` | lock ファイルの混入 | `package-lock.json` と `yarn.lock` を追加 |

- 実装時に確認すること
  - `preinstall` は pnpm 自身の install でも実行されるため、`only-allow` が pnpm を正しく通すか確認する。pnpm 11 でライフサイクルスクリプトの扱いが変わっていたら、`devEngines` だけで npm を止められているかを優先して判断する
  - `pnpm-workspace.yaml` の `allowBuilds` に `@parcel/watcher` が「未設定」として追記されている。`sass` が使うファイル監視の部品なので、`true` にするか確認したうえで決める

### 8. .gitignore

- 雛形の内容に次を追加する: `package-lock.json` / `yarn.lock` / `certificates/`（フェーズ 2 で mkcert が作る証明書）
- `.env*` は雛形で除外済み。`.env.example` はコミットしたいので `!.env.example` を追加する

## 完了条件

- [ ] `pnpm dev` で開発サーバーが起動し、仮のページが表示される
- [ ] `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm format:check` / `pnpm build` がすべて成功する
- [ ] `npm install` を実行するとエラーで止まる
- [ ] `*.module.scss` から `@use "tokens"` でトークンを読める

## コミットの単位（目安）

1. `feat: Next.js プロジェクトの雛形を追加`
2. `feat: Sass のトークンとグローバルスタイルを追加`
3. `feat: Prettier と Vitest の設定を追加`
4. `feat: pnpm 以外のパッケージマネージャーを使えないようにする`
