# スタイリング（デザイントークン・CSS Modules・ボタン・色）

「見た目をどう作っているか」の資料。Sass + CSS Modules、デザイントークン、グローバルのリセット、ボタンの共通化、色とコントラストの決まりを扱う。

- 主なファイル:
  - `src/styles/_tokens.scss`（デザイントークン）
  - `src/styles/globals.scss`（リセットとベーススタイル）
  - `src/styles/_button.scss`（ボタンの mixin）
  - `src/features/gantt/components/*/*.module.scss`（コンポーネントごとのスタイル）
  - `src/features/gantt/components/Button/`（標準の見た目のボタン）
- 関連する資料: [全体構成](../overview.md)、[帯のドラッグ](06-bar-drag.md#12-ドラッグ中の見た目)（帯の見た目）

## 目次

1. [全体の方針](#1-全体の方針)
2. [ファイルの役割](#2-ファイルの役割)
3. [デザイントークン（`_tokens.scss`）](#3-デザイントークン_tokensscss)
4. [CSS Modules の使い方](#4-css-modules-の使い方)
5. [グローバル CSS（`globals.scss`）](#5-グローバル-cssglobalsscss)
6. [ボタン](#6-ボタン)
7. [色とコントラスト](#7-色とコントラスト)
8. [動的な値はインラインスタイル](#8-動的な値はインラインスタイル)
9. [レスポンシブ（狭い画面）](#9-レスポンシブ狭い画面)
10. [スタイルを足すときの手順](#10-スタイルを足すときの手順)
11. [よくある質問](#11-よくある質問)

---

## 1. 全体の方針

| 方針                             | 内容                                                                                           |
| -------------------------------- | ---------------------------------------------------------------------------------------------- |
| Sass + CSS Modules               | コンポーネントのスタイルは同じ場所の `Xxx.module.scss` に書く。Tailwind は使わない             |
| トークンを使う                   | 色・余白・フォントサイズ・角丸などは `_tokens.scss` のトークンを使い、**生の値を直接書かない** |
| グローバル CSS は最小限          | `globals.scss` にはリセットとベーススタイルだけ。機能固有の調整は書かない                      |
| インラインスタイルは動的な値だけ | 帯の位置や幅など、実行時に決まる値に限る                                                       |
| 同じ見た目が複数箇所に出たら     | クラスの共通化より先に**コンポーネント化**（例: `Button`）                                     |
| ダークテーマ                     | 背景は 3 段階、線や薄い塗りは白の透明度で表す                                                  |

---

## 2. ファイルの役割

```
src/styles/
├── _tokens.scss     # デザイントークン（Sass 変数）と、CSS 変数として出力する mixin
├── _button.scss     # ボタンの共通スタイルの mixin（base / appearance）
└── globals.scss     # リセット・ベーススタイル・入力欄・フォーカス・選択色
```

- `_tokens.scss` と `_button.scss` は先頭が `_` の **Sass のパーシャル**（単体では出力されない）。各 `*.module.scss` から `@use "tokens";` / `@use "button";` で読む。
- `@use "tokens"` と書けるのは、`next.config.ts` の `sassOptions.loadPaths` に `src/styles` を指定しているため（[認証・PWA・開発環境](08-app-infrastructure.md#3-nextjs-の設定nextconfigts)）。
- `globals.scss` は `app/layout.tsx` で 1 回だけ読み込む。

---

## 3. デザイントークン（`_tokens.scss`）

**Sass 変数**（`*.module.scss` から `tokens.$color-primary` のように参照）と、**CSS カスタムプロパティ**（`:root` に出力。実行時に参照したい場合用）の両方を定義している。CSS 変数への出力は `export-css-variables` mixin で、`globals.scss` の `:root` 内で**一度だけ**呼ぶ。

> 帯の色（`--color-bar-blue` など）は、**CSS 変数名で参照する**（`useProjectBar` が `background-color: var(--color-bar-blue)` を作る）ので、CSS 変数として出力されている必要がある。

### 色

| グループ             | トークン                                                                                           | 値・用途                                                             |
| -------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 背景（3 段階）       | `$color-bg` / `$color-surface` / `$color-elevated`                                                 | `#0b0d12` → `#11141b` → `#171b24`。奥から手前へ                      |
| 背景のホバー         | `$color-elevated-hover`                                                                            | `#1f2430`                                                            |
| 線・薄い塗り         | `$color-border` / `-strong` / `-hover`                                                             | 白の 7% / 12% / 20%。**透明度で表す**ので、どの背景の上でもなじむ    |
| 文字                 | `$color-text` / `-muted` / `-subtle`                                                               | `#e6e8ee` / `#8b93a7` / `#5d6579`                                    |
| 主色                 | `$color-primary` / `-hover` / `-soft`                                                              | `#7182ff`（文字・枠・今日の線など）/ `#8794ff` / 薄い塗り            |
| 白文字を載せる主色   | `$color-primary-solid` / `-hover`                                                                  | `#5566ee` / `#4656db`（[§7](#7-色とコントラスト)）                   |
| 白文字               | `$color-on-primary`                                                                                | `#ffffff`                                                            |
| 危険                 | `$color-danger` / `-soft`                                                                          | `#f2667a`（文字・枠）/ 薄い塗り                                      |
| 白文字を載せる危険色 | `$color-danger-solid` / `-hover`                                                                   | `#d63a54` / `#c42f4b`                                                |
| 警告・成功           | `$color-warning` / `$color-success` / `-soft`                                                      | `#f5b454` / `#3ccf91`                                                |
| カレンダー           | `$color-saturday` / `$color-saturday-text` / `$color-holiday` / `$color-holiday-text`              | 土曜は青、日曜と祝日は赤（背景と日付ヘッダーの文字）                 |
| そのほか             | `$color-month-divider` / `$color-today` / `$color-row-member` / `$color-backdrop` / `$color-hover` | 月の区切り線 / 今日の列 / 担当者行の背景 / ダイアログの背面 / ホバー |
| 帯の色               | `$color-bar-blue` ほか 6 色                                                                        | [§7](#7-色とコントラスト)                                            |

### 余白・文字・形・影

| グループ         | トークン                            | 値                                                                                                                                                         |
| ---------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 余白             | `$space-1` 〜 `$space-6`            | 4 / 8 / 12 / 16 / 20 / 24 px                                                                                                                               |
| フォントサイズ   | `$font-size-base` / `$font-size-lg` | **16px** / 18px（画面の文字は最小 16px。大きさの差は色と太さで付ける。開閉の三角などの記号は文字ではないので、このトークンを使わず見た目の大きさで決める） |
| フォント         | `$font-family-base`                 | システムフォント（`system-ui`、ヒラギノ、游ゴシック、Noto Sans JP など。**Web フォントは使わない**）                                                       |
| 角丸             | `$radius-sm` / `-md` / `-lg`        | 6 / 10 / 14 px                                                                                                                                             |
| 影               | `$shadow-panel` / `$shadow-bar`     | パネル・ダイアログの影 / 帯の上辺のハイライト                                                                                                              |
| フォーカスリング | `$focus-ring`                       | `0 0 0 3px` の主色の半透明                                                                                                                                 |
| アニメーション   | `$transition-fast`                  | `120ms ease`                                                                                                                                               |

### サイズ・ブレークポイント・透明度・z-index

| トークン                                            | 値                | 用途                                           |
| --------------------------------------------------- | ----------------- | ---------------------------------------------- |
| `$header-height`                                    | 52px              | 上部のバーの高さ。サイドパネルはこの下から出す |
| `$member-list-width` / `-narrow`                    | 240px / 160px     | 左リストの幅（狭い画面で縮める）               |
| `$breakpoint-narrow`                                | 480px             | これ以下は「狭い画面」                         |
| `$opacity-completed-bar` / `-summary-bar` / `-text` | 0.4 / 0.15 / 0.55 | 完了済みの帯 / まとめ帯 / 案件名               |
| `$z-index-bar`                                      | 1                 | 帯                                             |
| `$z-index-bar-dragging`                             | 2                 | ドラッグ中の帯と期間の表示                     |
| `$z-index-sticky`                                   | 10                | sticky の左リスト（ヘッダーは +1、角は +2）    |
| `$z-index-panel`                                    | 100               | サイドパネル                                   |
| `$z-index-notice`                                   | 110               | 保存失敗のお知らせ（パネルより上）             |

行の高さ・列幅など**実装に関わる数値**（`DAY_COLUMN_WIDTH` など）は、トークンではなく `gantt.constants.ts` にある（TypeScript から使うため）。

---

## 4. CSS Modules の使い方

- 各コンポーネントのディレクトリに `Xxx.module.scss`。`import styles from "./Xxx.module.scss"` として、`styles.className` で使う。
- クラス名は自動でユニークにされる（例: `DateField-module-scss-module__xxxx__popover`）。ほかのコンポーネントのスタイルと衝突しない。
- **`styles.xxx` の型は `string | undefined`** になる（`noUncheckedIndexedAccess` のため）。`className` にそのまま渡すのは問題ないが、`string` が必要なところでは `?? ""` を付ける（`useDateField` の `modifiersClassNames` など）。
- **className の組み立ては、専用フック（`useXxx.ts`）**で行う。tsx には書かない。複数のクラスは配列に入れて `.filter(Boolean).join(" ")` でつなぐ書き方が多い。

  ```ts
  const rowClassName = [
    styles.row,
    isCompleted && styles.completed,
    dragState.isDragging && styles.dragging,
  ]
    .filter(Boolean)
    .join(" ")
  ```

- 外部ライブラリ（react-day-picker）のクラスを上書きするときは、`:global(.rdp-root)` で包む（`DateField.module.scss`）。

---

## 5. グローバル CSS（`globals.scss`）

置いてあるのは次だけ。

| 内容             | 詳細                                                                                                                       |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `:root`          | CSS 変数の出力（`export-css-variables`）と `color-scheme: dark`（日付ピッカーやスクロールバーもダーク表示）                |
| 狭い画面         | 480px 以下で `--member-list-width` を縮める                                                                                |
| リセット         | `box-sizing: border-box`、`body` の余白なし・背景・文字色・フォント・`-webkit-font-smoothing`                              |
| ボタンのリセット | `button { font: inherit; cursor: pointer; &:disabled { opacity: 0.45; cursor: not-allowed } }` だけ（[ボタン](#6-ボタン)） |
| 入力欄の基本形   | `input`（ラジオ・チェックボックスを除く）・`select`・`textarea` の枠・背景・余白・フォーカス時の主色の枠とリング           |
| フォーカス       | `button:focus-visible` で、キーボード操作のときだけフォーカスリング（`outline: none; box-shadow: $focus-ring`）            |
| 選択色           | `::selection`                                                                                                              |

> `button:focus-visible` が `box-shadow` を**差し替える**ので、帯のように影を持つボタンは、フォーカス時に影が消える。`ProjectBar.module.scss` は、帯の枠を `outline` で描き、影はそのまま残すよう `.bar:focus-visible` / `.editing:focus-visible` で上書きしている。

---

## 6. ボタン

### 方針: 標準の見た目を `button` 要素に当てない

以前は、`globals.scss` の `button` が**すべてのボタン**に枠・背景・余白を当てていた。そのため、専用の見た目の部品（帯・つかみ・カレンダーのボタンなど）が、それを個別に**打ち消す**必要があり、基本のボタンを変えるたびに全部に影響した。今は、標準の見た目を **明示的に取り込む**形にしている。

| 層                                          | 内容                                                                                         |
| ------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `globals.scss` の `button`                  | **最低限のリセット**（フォント・カーソル・無効のとき）だけ                                   |
| `styles/_button.scss` の `base` mixin       | 並べ方（`inline-flex`・中央寄せ・`gap`）・角丸・文字の太さ・色の切り替え（`transition`）だけ |
| `styles/_button.scss` の `appearance` mixin | `base` に、枠・背景・余白・文字色・ホバーの標準の見た目を足したもの                          |
| `Button` コンポーネント                     | `appearance` を取り込んだ標準のボタン                                                        |

### 使い分け

| ボタンの種類                  | 使うもの                                                                                | 例                                                                             |
| ----------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 標準の見た目のまま            | **`<Button>`**                                                                          | 「キャンセル」「閉じる」「担当者を管理」「◀ 今日 ▶」                           |
| 標準の見た目 + 色だけ変えたい | 個別のクラスで `@include button.appearance;` を取り込み、同じセレクターの中で色を上書き | 保存（主色）・削除（危険色）・確認の「削除する」・完了済みの切り替え・日付入力 |
| 枠・背景・余白を自分で決める  | 個別のクラスで `@include button.base;` だけ取り込む                                     | 帯（`ProjectBar`）・つかみ（`DragHandle`）・案件名・「案件を追加」・開閉の三角 |

```scss
// 色だけ変える例（ProjectSidePanel.module.scss）
.saveButton {
  @include button.appearance;

  border-color: tokens.$color-primary-solid;
  background: tokens.$color-primary-solid;
  color: tokens.$color-on-primary;

  &:hover:not(:disabled) {
    border-color: tokens.$color-primary-solid-hover;
    background: tokens.$color-primary-solid-hover;
  }
}
```

### `Button` コンポーネント（`components/Button/`）

```tsx
<Button type="button" onClick={...}>キャンセル</Button>
```

- `type` を省略すると `"button"`（送信にしたいときだけ `"submit"`）。
- **`className` は受け取らない**。色などを変えたいボタンは `Button` を使わず、個別のクラスで `appearance` を取り込む。`Button` の `.button` クラスと個別のクラスの**優先順位が、CSS の読み込み順で決まってしまう**（脆い）ため。
- 親側の**要素セレクター**（例: `.controls button`）で見た目を調整するのは構わない（詳細度が高いので、読み込み順に依らず効く）。

### 設計上の注意

- 色を変えるときは、`appearance` を取り込んだ**あとに**、同じセレクターの中で上書きする（クラスの読み込み順に頼らない）。
- ホバーの色の上書きは `&:hover:not(:disabled)` で書く（`appearance` 内のホバー規則と詳細度がそろう）。
- **白文字を載せる塗りつぶしは、`$color-primary-solid` / `$color-danger-solid` を使う**（[§7](#7-色とコントラスト)）。ホバーは明るくするとコントラストが下がるので、**暗くする**。

---

## 7. 色とコントラスト

**白文字（16px）を載せる塗りは、コントラスト比 4.5:1 以上**（WCAG AA）を確保する、というのが決まり。比は RGB 値から計算し、トークンのコメントに値を書いてある。**色や重ねる白の濃さを変えるときは、比を計算し直すこと**。

### 主色と危険色は「塗り用」を別に持つ

| 用途                                                                             | トークン                                                  | 白との比               |
| -------------------------------------------------------------------------------- | --------------------------------------------------------- | ---------------------- |
| 文字・枠・線（今日の線など）                                                     | `$color-primary`（`#7182ff`）                             | 3.31（4.5 に届かない） |
| **白文字を載せる塗り**（保存・追加・選択状態・カレンダーの選択日・今日のバッジ） | **`$color-primary-solid`**（`#5566ee`）/ ホバー `#4656db` | **4.64 / 5.81**        |
| 文字・枠                                                                         | `$color-danger`（`#f2667a`）                              | 3.02                   |
| **白文字を載せる塗り**（削除の確認ボタン）                                       | **`$color-danger-solid`**（`#d63a54`）/ ホバー `#c42f4b`  | **4.57 / 5.45**        |

ホバーは、以前は明るくしていてコントラストが下がっていたので、**暗くする**ように変えた。

### 帯の色（6 色）

白い文字（16px）が帯の上に載るので、**白とのコントラスト比 4.5 以上**になるよう、色相を保ったまま暗くしてある。

| キー     | 色       | トークン            | 値        |
| -------- | -------- | ------------------- | --------- |
| `blue`   | 青       | `$color-bar-blue`   | `#3256c3` |
| `green`  | 緑       | `$color-bar-green`  | `#0f6b52` |
| `orange` | オレンジ | `$color-bar-orange` | `#964a09` |
| `purple` | 紫       | `$color-bar-purple` | `#6d40d3` |
| `red`    | 赤       | `$color-bar-red`    | `#b3314b` |
| `gray`   | グレー   | `$color-bar-gray`   | `#525c6e` |

- 帯には**白のグラデーションを重ねて**立体感を出し（`$bar-gradient`: 上が白 12% → 下が 0%）、ホバー・ドラッグ中は**白を 6% 重ねる**（`$bar-highlight`）。その分を見込んで、**文字の上寄り（白 10%）で通常時 5.1 以上、ホバー・ドラッグ中（10% + 6% 重ね）でも 4.6 以上**になる値にしている。
- 色の選択肢（サイドパネルの色の丸）にも同じトークンが使われているので、色を変えると丸の見た目も変わる。
- 色のキーは `TBarColor`（`gantt.type.ts`）と `BAR_COLORS`（`gantt.constants.ts`）が対応する（`Record` なので、増減して対応を書き忘れると型エラー）。

> 以前は `filter: brightness(1.12)` でホバーを明るくしていたが、明るくなりすぎて白文字のコントラストが 3.8〜4.3 に下がった。グラデーションは `transition` できないので、ホバーの白は一瞬で切り替わる。

### カレンダーの色分け

土曜は青、日曜と祝日は赤（日付ヘッダーの文字、背景の列、`DateField` のカレンダーで共通）。祝日が土曜と重なるときは祝日（赤）を優先する。

---

## 8. 動的な値はインラインスタイル

インラインスタイル（`style` 属性）は、**実行時に値が決まるもの**だけに使う。

| 値                                         | どこで                                            | 理由                         |
| ------------------------------------------ | ------------------------------------------------- | ---------------------------- |
| 帯の `left` / `width` / `backgroundColor`  | `useProjectBar`                                   | 日付から計算する             |
| まとめ帯の `left` / `width` / `background` | `useMemberSummaryBar`                             | 同上                         |
| 日付ヘッダー・背景の列の幅                 | `useTimelineDateHeader` / `useTimelineGrid`       | 日数と列幅から計算する       |
| 今日の線の `left`                          | `TodayLine`                                       | 同上                         |
| グリッドの `grid-template-columns`         | `useGanttChart`                                   | `rangeDays × 32px` で決まる  |
| 行の高さ・ドラッグ中の `transform`         | `getRowHeight` など                               | 行の種別・ドラッグ量で決まる |
| 色の丸・色見本の背景                       | `useMemberListProjectRow` / `useProjectSidePanel` | 帯の色のキーで決まる         |

> 帯の色は `background` ではなく **`backgroundColor`** で渡す。`background`（一括指定）だと、`.bar` に当てた `background-image`（グラデーション）が消える。

---

## 9. レスポンシブ（狭い画面）

スマホは**あまり想定していない**（閲覧できれば可）。以下の最低限の調整だけある。実機では確認していない。

| 480px 以下（`$breakpoint-narrow`） | 内容                                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------------------ |
| 左リストの幅                       | 240px → 160px（`--member-list-width`。タイムラインの見える幅を残す）                             |
| ヘッダー                           | タイトルを隠す。「完了済みを表示（3）」を短い文言（「完了済み（3）」）に切り替える。余白を詰める |
| サイドパネル                       | 画面の全幅で出す                                                                                 |
| 400px 以下                         | さらに余白を詰める（`◀ 今日 ▶` のボタン）                                                        |

`@media (pointer: coarse)`（指で操作する端末）では、帯の伸縮のつかみを 6px から 10px に広げている。

---

## 10. スタイルを足すときの手順

1. 色・余白・フォントサイズ・角丸は、**`_tokens.scss` のトークン**から選ぶ。足りなければトークンを足す（生の値は書かない）。
2. 新しいコンポーネントなら、同じディレクトリに `Xxx.module.scss` を作り、先頭に `@use "tokens";`（ボタンなら `@use "button";` も）。
3. ボタンを足すなら、[使い分け](#使い分け)に従う。標準の見た目なら `<Button>`。
4. 白文字を載せる塗りなら、`*-solid` トークンを使う。新しい色を足すなら、白とのコントラスト比を計算する。
5. className の組み立てはフックで。tsx には書かない。
6. 動的な値だけインラインスタイルにする。
7. 見た目を変えたら、`pnpm lint` / `pnpm typecheck` / `pnpm format:check`。ブラウザで目視する（特に帯の色・ボタンの色）。

---

## 11. よくある質問

**Q. なぜ Tailwind ではなく Sass + CSS Modules なのですか？**
プロジェクトの技術構成として、最初に Sass + CSS Modules に決めています。トークンを Sass 変数と CSS 変数の両方で持ち、コンポーネントごとにスタイルを分けられるためです。

**Q. 新しいボタンを足したら、見た目が崩れました（枠がない・背景がない）。**
`button` 要素には標準の見た目が当たりません。`<Button>`（標準の見た目）を使うか、個別のクラスで `@include button.appearance;`（または `button.base`）を取り込んでください。

**Q. 保存ボタンの色を変えたいです。**
`ProjectSidePanel.module.scss` の `.saveButton` の色を変えます。白文字を載せるので、**白とのコントラスト比 4.5 以上**になるようにし、ホバーは暗くします。

**Q. 帯の色を増やしたいです。**
`TBarColor`（`gantt.type.ts`）に足し、`BAR_COLORS`（`gantt.constants.ts`）に表示名と CSS 変数名を足し、`_tokens.scss` に `$color-bar-xxx` と `--color-bar-xxx`（`export-css-variables`）を足します。白とのコントラストは、文字の上寄り（白 10% を重ねた状態）で 4.5 以上にします。型ガード `isBarColor`（`gantt.guards.ts`）は `BAR_COLORS` を見ているので、自動で対応します。

**Q. ダークモードとライトモードの切り替えはありますか？**
ありません。ダークテーマだけです（`color-scheme: dark`）。

**Q. `styles.xxx` に `?? ""` が付いているのはなぜですか？**
`noUncheckedIndexedAccess` により、CSS Modules のクラスの型が `string | undefined` になるためです。`className` に渡すだけなら不要で、`string` が必要な箇所だけ付けています。
