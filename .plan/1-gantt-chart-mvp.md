# 1. ガントチャート MVP 実装プラン

担当者ごとに「いつ・どの案件を作業しているか」を一目で確認・編集できる、シンプルなガントチャートサイトを作る。

出典: `指示下書き/下書きメモ.md` と、その後のやり取りで確定した内容。

---

## 0. 確定事項と前提

### 確定事項

| 項目 | 決定内容 |
| --- | --- |
| フレームワーク | Next.js（App Router）+ TypeScript。**Vite は使わない**（Next.js は独自バンドラーを使うため併用できない） |
| スタイル | Sass（CSS Modules: `*.module.scss`） |
| データ保存 | 開発中は localStorage。将来 Firestore へ移行しやすい構造にする |
| Firebase 接続方式（将来） | **サーバー側（Route Handler + Firebase Admin SDK）からのみアクセス**する。フロントには Firebase の設定値やキーを置かない |
| 認証 | ユーザー認証はしない。身内利用のため **Basic 認証**をかける |
| 時間軸 | **日単位のみ**（週・月の切り替えはスコープ外） |
| MVP の機能 | 帯のドラッグ移動・伸縮 / 担当者の追加・編集・削除 / 担当者行の折りたたみ / 今日の位置の線・土日祝の色分け |
| PWA | 対応する。ローカル開発環境も HTTPS にする |
| パッケージマネージャー | **pnpm のみ**。npm / yarn では操作できないようにする |
| AI エージェント用設定 | グローバルの `~/.claude/CLAUDE.md` をもとに `CLAUDE.md` と `AGENTS.md` を作る |

### 前提（違っていれば実装前に指摘してください）

- **案件の担当者は 1 人**とする。複数人で同じ案件を担当する場合は、担当者ごとに別の案件として登録する（下書きメモの「担当者が親、案件名が子」の構造に合わせるため）
- 期間は **開始日〜終了日（終了日を含む）** の日付で持つ。時刻は持たない
- タイムラインは無限に横スクロールできる。初期は「今日の 60 日前から 180 日分」を用意し、スクロールが端に近づくたびに 90 日ずつ範囲を広げる（2026-10-29 に「2 か月分」から変更）。◀ / ▶ は 14 日ぶんのスクロール、「今日」は今日が見える位置へのスクロール
- 祝日の判定には日本の祝日ライブラリを使う（候補: `@holiday-jp/holiday_jp`。実装時に保守状況を確認する）
- ライブラリのバージョンは実装時点の最新安定版を使う（2026-10-29 時点で Next.js 16.4.3 / pnpm 11.5.2 / Node 24）。Next.js 16 では `middleware.ts` が `proxy.ts` に変わっていることを、同梱ドキュメントで確認済み
- 対象ブラウザは最新の Chrome / Safari / Edge（PC 中心。スマホは閲覧できれば可）

---

## 1. 画面仕様

```
┌──────────────────────────────────────────────────────────────┐
│ ヘッダー: タイトル / ◀ 今日 ▶（スクロール）                │
├───────────────┬──────────────────────────────────┬───────────┤
│ 左: リスト    │ 右: タイムライン（日単位グリッド）   │ サイド    │
│ ▼ 田中        │  ░░ 土日祝の背景色  │ ← 今日の線      │ パネル    │
│    案件A      │      ████████                      │ （帯クリック │
│    案件B      │            ██████████              │  / 追加ボタン │
│ ▶ 佐藤（折りたたみ）│                              │  で開く）  │
│ [+ 案件を追加] │                                   │           │
│ [担当者を管理] │                                   │           │
└───────────────┴──────────────────────────────────┴───────────┘
```

- **左のリスト**: 担当者（親）→ 案件（子）の 2 階層。担当者行のクリックで配下の案件を折りたたむ。各担当者の案件の下に「案件を追加」ボタン（その担当者が初期選択になる）、最下部に「担当者を管理」ボタン
- **案件の並び替え**（フェーズ 9 で追加）: 左のリストの案件名の左にあるつかみのアイコンをドラッグ＆ドロップして、同じ担当者の中で並べ替える。並び順は保存する
- **案件の完了**（フェーズ 10 で追加）: サイドパネルの「完了にする」で完了にすると、ガントチャートから非表示になる（削除はしない）。ヘッダー右上の切り替えボタンで、完了済みの案件も表示できる
- **右のタイムライン**: 1 列 = 1 日。左のリストと行の高さ・縦スクロールを同期させる。横スクロールのとき日付ヘッダーは上部に固定する
  - 担当者行には、配下の案件を細い帯でまとめて表示する（折りたたみ中でも予定が分かるように）
  - 今日の列に縦線を引く。土日祝は背景色を変える
- **帯の操作**
  - クリック: サイドパネルを開いて、その案件を編集する
  - ドラッグ（中央部分）: 期間を保ったまま移動する。1 日単位で吸着させる
  - ドラッグ（左右の端）: 開始日・終了日を伸縮する。開始日が終了日を超えないようにする
  - クリックとドラッグは移動量のしきい値（数 px）で区別する
- **サイドパネル**（案件の追加・編集）
  - 入力項目: 担当者（選択式）/ 案件名 / 開始日 / 終了日 / 帯の色 / メモ
  - バリデーション: 案件名は必須、開始日 ≦ 終了日
  - 操作: 保存 / キャンセル / 削除（編集時のみ。確認ダイアログを出す）
- **担当者の管理**: 追加・名前変更・並び替え・削除。案件を持つ担当者を削除するときは、配下の案件も削除されることを確認ダイアログで伝える

---

## 2. データ設計（Firestore への移行を前提にする）

Firestore のコレクションにそのまま置き換えられるよう、**フラットな 2 コレクション構成**にする。入れ子にせず、案件は `memberId` で担当者を参照する。

```ts
/** 担当者（Firestore: members コレクション） */
interface IMember {
  id: string // ドキュメント ID（crypto.randomUUID() で生成）
  name: string
  sortOrder: number // 左リストでの表示順
  createdAt: string // ISO 8601 形式の日時
  updatedAt: string
}

/** 案件（Firestore: projects コレクション） */
interface IProject {
  id: string
  memberId: string // 担当者の ID
  name: string
  startDate: string // "YYYY-MM-DD"（この日を含む）
  endDate: string // "YYYY-MM-DD"（この日を含む）
  color: string // 帯の色。用意したプリセットのキー
  note: string // メモ（任意。空文字可）
  sortOrder: number // 担当者の中での表示順（フェーズ 9 で追加。担当者ごとに 0 から）
  completedAt: string | null // 完了にした日時（フェーズ 10 で追加。未完了は null）
  createdAt: string
  updatedAt: string
}
```

- 日付は `Date` ではなく文字列で持つ。タイムゾーンのずれを防ぎ、JSON や Firestore との相互変換を単純にするため
- localStorage では `gantt:members` / `gantt:projects` のキーに配列を `JSON.stringify` で保存する。`gantt:schemaVersion` も持たせ、将来の構造変更に備える
- localStorage から読み込んだ値は `unknown` として受け取り、型ガード（`isMember` / `isProject`）で検証してから使う

### データアクセス層（Repository パターン）

```
UI（コンポーネント）
  └─ カスタムフック（useMembers / useProjects）
        └─ IGanttRepository（インターフェース）
              ├─ LocalStorageRepository   … MVP で使う
              └─ ApiRepository            … 将来: fetch → Route Handler → Admin SDK → Firestore
```

- `IGanttRepository` は `listMembers` / `saveMember` / `deleteMember` / `listProjects` / `saveProject` / `deleteProject` を **すべて Promise を返す非同期 API** として定義する。localStorage は同期処理だが、Firestore 移行時に呼び出し側を変えずに済むようにするため
- 実装の差し替えは 1 か所（repository を生成するファクトリ）だけで済むようにする
- 担当者を削除したときに配下の案件もまとめて消す処理は repository 側の責務にする（Firestore では batch 書き込みになる想定）

---

## 3. 技術構成

| 用途 | 採用するもの | 備考 |
| --- | --- | --- |
| フレームワーク | Next.js（App Router） | ガントチャートは Client Component で描画。ページ本体は Server Component |
| 言語 | TypeScript（strict） | `any` 禁止。`noUncheckedIndexedAccess` も有効にする |
| スタイル | Sass（`sass` パッケージ）+ CSS Modules | 色・余白などのトークンは `src/styles/_tokens.scss` に集める |
| PWA | `app/manifest.ts` + 最小限の `public/sw.js` | Next.js 公式ガイドの方法。オフラインキャッシュはスコープ外のため Serwist は使わない |
| ローカル HTTPS | `next dev --experimental-https` | 初回に mkcert で証明書が自動生成される。`pnpm dev` に組み込む |
| Basic 認証 | `src/proxy.ts`（Next.js 16 で middleware から改名） | ID とパスワードは環境変数（`BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD`）から読む。未設定のときは、開発環境では認証を省略し、本番環境ではすべて拒否する |
| 日付処理 | date-fns | 日付の加算・差分・曜日判定に使う |
| 祝日 | `@holiday-jp/holiday_jp`（候補） | 実装時に確認する |
| ドラッグ | Pointer Events で自作 | 1 日単位の吸着だけなのでライブラリは使わない |
| lint / format | ESLint（Next.js の設定）+ Prettier | セミコロンなし、ダブルクォート、末尾カンマあり |
| テスト | Vitest | 日付計算・位置計算・型ガード・repository の単体テストに限定する |

### pnpm 以外を使えないようにする仕組み

1. `package.json` の `devEngines.packageManager` に pnpm を指定し、`onFail: "error"` にする（npm 10.9 以降は install 時にこれを検査して止まる）
2. `package.json` の `scripts.preinstall` に `pnpm dlx only-allow pnpm` を設定する（npm / yarn で install するとエラーで止まる）
3. `package.json` に `packageManager: "pnpm@<バージョン>"` を明記し、Corepack で pnpm のバージョンを固定する
4. `package.json` の `engines` に pnpm を指定し、`pnpm-workspace.yaml` で `engineStrict: true` にする
5. `package-lock.json` / `yarn.lock` を `.gitignore` に追加する
6. CLAUDE.md / AGENTS.md に「npm・yarn コマンドは使わない」と明記する

### 将来の Firebase 移行に向けて（今回は実装しない）

- `src/app/api/` に Route Handler を置き、サーバー側だけで Firebase Admin SDK を使う
- サービスアカウントの認証情報はサーバーの環境変数だけで扱い、`NEXT_PUBLIC_` は付けない
- Firestore の Security Rules はクライアントからのアクセスを **すべて拒否** にする
- Firestore を使う段階で、ホスティング先（Firebase App Hosting / Vercel など）を決める

---

## 4. ディレクトリ構成（案）

```
gant-chart/
├── AGENTS.md                  # Codex 向け（共通規約の本体）
├── CLAUDE.md                  # Claude 向け（AGENTS.md を読み込み、Claude 固有の設定を追記）
├── pnpm-workspace.yaml       # pnpm の設定（engineStrict など）
├── .env.example               # BASIC_AUTH_USER / BASIC_AUTH_PASSWORD
├── next.config.ts
├── package.json
├── public/
│   ├── sw.js                  # 最小限の Service Worker
│   └── icons/                 # PWA アイコン
└── src/
    ├── proxy.ts               # Basic 認証
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx           # ガントチャート画面
    │   ├── manifest.ts
    ├── styles/
    │   ├── _tokens.scss
    │   └── globals.scss
    ├── features/
    │   └── gantt/             # ガントチャート機能はこの中で完結させる
    │       ├── components/
    │       │   ├── GanttChart.tsx
    │       │   ├── GanttHeader.tsx
    │       │   ├── MemberList.tsx
    │       │   ├── Timeline.tsx
    │       │   ├── TimelineGrid.tsx
    │       │   ├── ProjectBar.tsx
    │       │   ├── TodayLine.tsx
    │       │   ├── ProjectSidePanel.tsx
    │       │   ├── MemberManageDialog.tsx
    │       │   └── ConfirmDialog.tsx
    │       ├── hooks/
    │       │   ├── useGanttPage.ts        # ページ全体のフック（下のフックを束ねる）
    │       │   ├── useMembers.ts
    │       │   ├── useProjects.ts
    │       │   ├── useTimelineRange.ts    # 用意する日付の範囲（端で広げる）
    │       │   ├── useSidePanel.ts        # 開閉状態・編集対象
    │       │   ├── useCollapsedMembers.ts # 折りたたみ状態
    │       │   └── useBarDrag.ts          # 帯のドラッグ移動・伸縮
    │       ├── repositories/
    │       │   ├── ganttRepository.type.ts
    │       │   ├── localStorageRepository.ts
    │       │   └── createGanttRepository.ts
    │       ├── gantt.type.ts
    │       ├── gantt.constants.ts         # 列幅・行の高さ・色プリセット・ストレージキー
    │       ├── gantt.guards.ts            # isMember / isProject
    │       └── gantt.utils.ts             # 日付計算・座標計算
    └── test/                              # 必要に応じて（またはソースと同じ場所に *.test.ts）
```

- コンポーネントの数は実装しながら調整する。共有ディレクトリ（`src/components` など）は、ほかの機能から再利用されるまで作らない

---

## 5. 実装ステップ

実装は次のフェーズに分けて進める。各フェーズの作業内容・完了条件・コミットの単位は、それぞれのプランファイルに書いてある。

### 準備（完了済み）

- `main` に最初のコミットを作成し、作業用ブランチ `feat/gantt-chart-mvp` を切った
- グローバル CLAUDE.md をもとに `AGENTS.md` / `CLAUDE.md` を作成した（詳細は 6 章）

### フェーズ一覧

| フェーズ | プラン | 内容 | 担当 |
| --- | --- | --- | --- |
| 1 | [2-phase1-project-setup.md](2-phase1-project-setup.md) | Next.js の雛形、Sass の土台、ESLint・Prettier・Vitest、pnpm 以外の禁止 | Sonnet 5.5 |
| 2 | [3-phase2-https-pwa-basic-auth.md](3-phase2-https-pwa-basic-auth.md) | ローカル HTTPS、PWA、Basic 認証 | Sonnet 5.5 |
| 3 | [4-phase3-data-layer.md](4-phase3-data-layer.md) | 型・型ガード・Repository（localStorage 版） | Opus 5.5 |
| 4 | [5-phase4-date-layout-utils.md](5-phase4-date-layout-utils.md) | 日付と帯の位置の計算処理 | Sonnet 5.5 |
| 5 | [6-phase5-chart-layout.md](6-phase5-chart-layout.md) | 左リストとタイムラインの表示、折りたたみ、今日の線、土日祝 | Sonnet 5.5 |
| 6 | [7-phase6-project-side-panel.md](7-phase6-project-side-panel.md) | サイドパネルでの案件の追加・編集・削除 | Sonnet 5.5 |
| 7 | [8-phase7-member-management.md](8-phase7-member-management.md) | 担当者の追加・名前変更・並び替え・削除 | Sonnet 5.5 |
| 8 | [9-phase8-bar-drag.md](9-phase8-bar-drag.md) | 帯のドラッグ移動・伸縮 | Opus 5.5 |
| 9 | [10-phase9-project-reorder.md](10-phase9-project-reorder.md) | 案件の並び替え（担当者の中でドラッグ＆ドロップ） | Opus 5.5 |
| 10 | [11-phase10-project-complete.md](11-phase10-project-complete.md) | 案件の完了と、完了済みの表示切り替え | Sonnet 5.5 |
| 11 | [12-phase11-polish-review.md](12-phase11-polish-review.md) | 仕上げ、全体の検証、Codex によるコードレビュー | Sonnet 5.5 / Codex |

- 依存関係: 1 → 2、1 → 3 → 4 → 5 → 6 → 7・8 → 9 → 10 → 11（2 と 3 は入れ替え可能、7 と 8 も入れ替え可能）
- フェーズ 9・10 は 2026-10-30 に追加した（MVP の後の機能追加）。もとのフェーズ 9（仕上げ）はフェーズ 11 に繰り下げた
- 各フェーズの終わりに `pnpm lint` / `pnpm typecheck` / `pnpm test` を通し、ユーザーの確認を受けてから次のフェーズへ進む
- Claude の使用量が 90% を超えた場合は、残りのフェーズを Codex に切り替える（AGENTS.md があるので同じ規約で進められる）

---

## 6. AGENTS.md / CLAUDE.md の作り方

Codex は `AGENTS.md`、Claude Code は `CLAUDE.md` を読むため、**規約の本体は AGENTS.md に 1 つだけ書き、CLAUDE.md からはそれを読み込む**構成にして内容の二重管理を避ける。

- **AGENTS.md**（共通規約の本体）
  - グローバル CLAUDE.md の内容のうち、どのエージェントにも当てはまるもの: 最重要原則、言語、作業の進め方、設計・配置、命名規則、コーディング規約、TypeScript / React の規約、コミット・ブランチの規約、安全確認
  - このプロジェクト固有の内容: 技術構成、ディレクトリ構成、データ設計の方針（repository を経由する、日付は文字列で持つ）、利用できるコマンド（`pnpm dev` / `lint` / `typecheck` / `test` / `build`）、**npm・yarn の禁止**
  - React の規約のうち Tailwind の項目は、このプロジェクトでは Sass を使うため「Sass / CSS Modules の規約」に書き換える
- **CLAUDE.md**
  - 先頭で `@AGENTS.md` を読み込む
  - Claude 固有の内容だけを追記する: skill の使い方、GitHub の操作は GitHub MCP 経由で行うこと
- グローバル側を後から更新したときに、プロジェクト側へ反映し忘れないよう、AGENTS.md の冒頭に「元にしたのはグローバル CLAUDE.md」と書いておく

---

## 7. 検証計画

- **自動**: `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build`
- **手動で確認する項目**
  - [ ] 案件の追加・編集・削除の内容が、再読み込み後も残る
  - [ ] 帯のドラッグ移動・伸縮が 1 日単位で吸着し、クリックとは区別される
  - [ ] 担当者の折りたたみ・削除（配下の案件もまとめて削除）
  - [ ] 案件をドラッグ＆ドロップで並べ替えられ、担当者の外へは移せない。並び順が再読み込み後も残る
  - [ ] 完了にした案件が非表示になり、切り替えボタンで表示できる
  - [ ] 今日の線と土日祝の色分けが正しい日付に出ている
  - [ ] 左リストとタイムラインの縦スクロールがずれない
  - [ ] `https://localhost:3000` で Basic 認証が表示され、正しい ID とパスワードで開ける
  - [ ] PWA としてインストールでき、アプリのウィンドウで起動する
  - [ ] `npm install` を実行するとエラーで止まる

---

## 8. スコープ外（今回はやらない）

- 週単位・月単位の表示切り替え
- Firebase / Firestore への接続、デプロイ
- ユーザー認証（Basic 認証以外）
- 1 つの案件を複数の担当者で持つこと
- 案件どうしの依存関係（矢印）、進捗率の表示
- オフライン時のデータ同期・キャッシュ（PWA はインストールして起動できるところまで。対応するときは Serwist の導入を検討する）
