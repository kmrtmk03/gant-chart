# フェーズ 3: データ層（型・型ガード・Repository）

- 全体プラン: [1-gantt-chart-mvp.md](1-gantt-chart-mvp.md)（2 章「データ設計」）
- 担当: **Opus 5.5**（Firestore への移行のしやすさを左右するため）
- ブランチ: `feat/gantt-data-layer`
- 前提: フェーズ 1 が完了している（フェーズ 2 とは独立しているので、順番は入れ替えてもよい）

## 目的

画面から使うデータの型と、localStorage への保存処理を作る。保存先を Firestore に替えるときに、画面やフックのコードを変えずに済むようにする。

## 作業内容

### 1. 型（`src/features/gantt/gantt.type.ts`）

- `IMember` / `IProject`: 全体プラン 2 章のとおり
- 保存前の入力用の型を、ベース型から差分で作る
  - `TMemberInput = Pick<IMember, "name">`（`id` / `sortOrder` / 日時は repository が付ける）
  - `TProjectInput = Omit<IProject, "id" | "createdAt" | "updatedAt">`
  - 更新用は `TProjectUpdate = Partial<TProjectInput>` と `id` の組み合わせ
- `TDateString`: `"YYYY-MM-DD"` を表す型エイリアス（`string` の別名。意味を伝えるため）
- `TBarColor`: 色プリセットのキーの Union 型（例: `"blue" | "green" | "orange" | "purple" | "red" | "gray"`）

### 2. 定数（`src/features/gantt/gantt.constants.ts`）

- localStorage のキー: `STORAGE_KEYS = { members: "gantt:members", projects: "gantt:projects", schemaVersion: "gantt:schemaVersion" }`
- `CURRENT_SCHEMA_VERSION = 1`
- 色プリセット: `BAR_COLORS`（キーと表示名。実際の色はトークンに置き、ここでは CSS 変数名だけを持つ）
- `DEFAULT_BAR_COLOR`

### 3. 型ガード（`src/features/gantt/gantt.guards.ts`）

- `isDateString(value): value is TDateString`: 形式だけでなく、実在する日付か（`2026-02-30` を弾く）まで確認する
- `isBarColor` / `isMember` / `isProject`
- `isMemberList` / `isProjectList`: 配列の各要素を検証する
- それぞれに「localStorage は手で書き換えられたり、古い構造のまま残ったりするので検証する」などの理由をコメントで残す

### 4. Repository のインターフェース（`repositories/ganttRepository.type.ts`）

```ts
interface IGanttRepository {
  listMembers(): Promise<IMember[]> // sortOrder の昇順で返す
  createMember(input: TMemberInput): Promise<IMember>
  updateMember(id: string, input: Partial<TMemberInput>): Promise<IMember>
  reorderMembers(orderedIds: string[]): Promise<IMember[]>
  deleteMember(id: string): Promise<void> // 配下の案件もまとめて削除する

  listProjects(): Promise<IProject[]>
  createProject(input: TProjectInput): Promise<IProject>
  updateProject(id: string, input: Partial<TProjectInput>): Promise<IProject>
  deleteProject(id: string): Promise<void>
}
```

- すべて Promise を返す（Firestore 版に差し替えても呼び出し側を変えないため）
- 存在しない `id` を指定したときは、専用のエラー（`GanttNotFoundError`）を投げる
- `startDate > endDate` の入力はエラーにする（画面側でも防ぐが、データの整合性は repository でも守る）

### 5. localStorage 版（`repositories/localStorageRepository.ts`）

- 読み込み: `JSON.parse` → 型ガードで検証 → 不正なデータは捨てて空配列から始める（コンソールに警告を出す）
- `schemaVersion` が古い場合の移行処理の入口だけ用意する（今はバージョン 1 のみ）
- `id` は `crypto.randomUUID()`、日時は `new Date().toISOString()`
- 担当者を削除したときは、配下の案件を同時に削除する（localStorage では 2 つのキーを続けて書き込む）
- `window` がない環境（サーバー側のレンダリング）では呼ばれない前提にし、呼ばれた場合はエラーにする
- テストしやすいよう、`Storage` を引数で受け取れるようにする（既定値は `window.localStorage`）

### 6. 生成関数（`repositories/createGanttRepository.ts`）

- 今は localStorage 版を返すだけ。将来ここを `ApiRepository` に差し替える
- `MEMO:` コメントで、Firestore 移行時の差し替え方を書いておく

### 7. テスト

- `gantt.guards.test.ts`: 正常な値、欠けたフィールド、型違い、実在しない日付
- `localStorageRepository.test.ts`: メモリ上の `Storage` のモックを渡して、作成・更新・並び替え・削除、担当者削除で案件も消えること、壊れたデータを読んだときの挙動を確認する

## 完了条件

- [x] Repository の全メソッドのテストが通る
- [x] 画面のコードがまだなくても、型と repository だけで追加・編集・削除ができる
- [x] `pnpm lint` / `pnpm typecheck` / `pnpm test` が成功する

## コミットの単位（目安）

1. `feat: ガントチャートの型と定数、型ガードを追加`
2. `feat: localStorage を使う repository を追加`
