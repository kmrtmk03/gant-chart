# フェーズ 9: 案件の並び替え（ドラッグ＆ドロップ）

- 全体プラン: [1-gantt-chart-mvp.md](1-gantt-chart-mvp.md)
- 担当: **Opus 5.5**（データ構造の変更とスキーマの移行、ポインター操作によるドラッグを含むため）
- ブランチ: `feat/gantt-project-reorder`
- 前提: フェーズ 8 が完了している（帯のドラッグと同じ Pointer Events の作りに合わせるため）

## 目的

担当者ごとの案件の並び順を、ユーザーが自由に決められるようにする。今は開始日順（`groupProjectsByMember` で並べている）に固定されている。

- 左のリストの案件名の左側に「つかみ」のアイコンを置き、それをドラッグ＆ドロップして並べ替える
- 並べ替えられる範囲は**同じ担当者の中だけ**。別の担当者の下へは移せない（担当者の付け替えは、これまでどおりサイドパネルで行う）
- 並び順は保存し、再読み込みしても残る。右のタイムラインの行も同じ順に並ぶ

## 作業内容

### 1. データ層（並び順の保存）

- `IProject` に `sortOrder: number` を足す（担当者の中での表示順。小さいほど上）。`IMember.sortOrder` と同じ考え方
  - 値は**担当者ごとに 0 から**振る。Firestore に移したときも、担当者で絞り込んで `sortOrder` で並べるだけで済むようにするため
- `TProjectInput` / `TProjectUpdate` には `sortOrder` を含めない（`Omit` に足す）。並び順を変えるのは下の `reorderProjects` だけにする
- `isProject` に `sortOrder`（0 以上の整数）の検証を足す。`gantt.guards.test.ts` も更新する
- `IGanttRepository` に次を足し、`LocalStorageRepository` に実装する
  ```ts
  /**
   * 担当者の中の案件の表示順を、渡した id の並びのとおりに付け直す。
   * orderedIds にはその担当者の案件の id を過不足なく 1 回ずつ含めること（足りない・余計な id があれば GanttValidationError）。
   * 戻り値は並び替え後のその担当者の案件（sortOrder の昇順）
   */
  reorderProjects(memberId: string, orderedIds: string[]): Promise<IProject[]>
  ```
  - `reorderMembers` と同じく、順番が変わらない案件は `updatedAt` を変えない
- 既存のメソッドの変更
  - `createProject`: 追加先の担当者の**一番下**（その担当者の `sortOrder` の最大値 + 1）にする
  - `updateProject`: `memberId` が変わったとき（サイドパネルで担当者を付け替えたとき）は、付け替え先の一番下にする。付け替え元に残った案件の `sortOrder` は詰め直さない（飛び番があっても並びは変わらないため）
  - `listProjects` は今のまま保存順で返す（並べるのは画面側）
- **スキーマの移行（バージョン 1 → 2）**: `CURRENT_SCHEMA_VERSION` を 2 にし、`SCHEMA_MIGRATIONS` に `1: (storage) => { ... }` を足す
  - 既存の案件に、**今の画面と同じ並び（開始日順 → 終了日順）**で担当者ごとに 0 から `sortOrder` を振る。移行の直後に見た目の並びが変わらないようにするため
  - 移行前のデータが壊れている（JSON として読めない・形が違う）ときは何もしない（読み込み時の既存の扱い = 空から始める、に任せる）
  - 移行のテスト（バージョン 1 のデータを入れて読むと `sortOrder` が付く・バージョン 2 として保存される・壊れたデータでも例外にならない）を `localStorageRepository.test.ts` に足す
- `devSeed.ts` のサンプルデータが新しい形で作られることを確認する

### 2. 画面側の並び

- `groupProjectsByMember` の並べ方を「`sortOrder` の昇順（同じ値なら開始日順 → id）」に変える。テストも更新する
- これで左のリスト・右のタイムライン・担当者行のまとめ帯（`MemberSummaryBar`）の順がそろう（どれも `memberGroups` を使っている）

### 3. フック

- `useProjects` に `reorderProjects(memberId, orderedIds)` を足す。ほかの操作と同じく、保存が成功してから state を更新し、失敗は例外のまま投げる
- 並び替えのドラッグのフック（`useProjectReorder`。左のリストの担当者 1 人ぶんごとに持つか、リスト全体で 1 つ持つかは実装時に決める）
  - Pointer Events（`pointerdown` / `pointermove` / `pointerup` / `pointercancel`）で実装する。**ライブラリは使わない**（帯のドラッグと同じ方針）
  - `pointerdown` はつかみのアイコンだけで受け、`setPointerCapture` する。`pointermove` 以降は、帯のドラッグと同じくドラッグ中だけ `window` に登録し、同じ `useEffect` で解除する
  - ドラッグ中の状態（例）
    ```ts
    interface IProjectReorderState {
      memberId: string
      projectId: string // つかんでいる案件
      pointerId: number // 2 本目の指の動きを無視するため
      startClientY: number
      fromIndex: number // つかんだときの位置
      toIndex: number // 今のポインター位置から求めた、落とす先の位置
      isDragging: boolean // しきい値（DRAG_THRESHOLD_PX）を超えたら true
    }
    ```
  - 落とす先の位置は、ポインターの縦の移動量を `PROJECT_ROW_HEIGHT` で割って求め、その担当者の案件の範囲（0 〜 件数 - 1）に収める。計算は純粋関数（`projectReorder.utils.ts`）に切り出してテストする
  - 離したとき、位置が変わっていれば `reorderProjects` を 1 回だけ呼ぶ。保存中は変更後の並びで描き、失敗したら元の並びに戻してエラーを表示する（帯のドラッグの `barDrag.error` と同じく、左下のお知らせに出す）
  - `pointercancel` と `Esc` では取り消して元に戻す（Esc は帯のドラッグと同じく window のキャプチャ段階で受け、サイドパネルの Esc まで届かないようにする）
- `useGanttPage` で `projectReorder` のようなグループにまとめて公開する

### 4. 見た目（`MemberList`）

- 案件の行の左端（案件名の左、色の丸の手前）に、つかみのアイコン（縦の点 6 つ `⋮⋮` など）を置く
  - カーソルは `grab`、ドラッグ中は `grabbing`。`touch-action: none` にして、タッチでもスクロールではなくドラッグになるようにする
  - `aria-label`（例: 「案件A の並び順を変更」）を付ける
  - 案件が 1 件だけの担当者でもアイコンは出す（動かせないだけ）。見た目をそろえるため
- ドラッグ中
  - つかんでいる行を少し浮かせて（影・透明度）ポインターに追従させる
  - 落とす先に横線（挿入位置の目印）を出す
  - 右のタイムラインは**離して保存するまで並びを変えない**（ドラッグ中に `Timeline` 全体を再描画しないため。帯のドラッグと同じ考え方）
- つかみ以外（案件名のボタン）のクリックは、これまでどおりサイドパネルを開く。つかみのクリック（しきい値未満で離す）では何もしない
- 担当者が折りたたまれているときは案件の行がないので、並び替えもできない
- 新しい色・影が必要なら `_tokens.scss` にトークンを足す

### 5. テスト

- 型ガード（`sortOrder`）、repository（`reorderProjects` の正常系・id の過不足・存在しない担当者、`createProject` / `updateProject` の `sortOrder`、スキーマの移行）、`groupProjectsByMember` の並び、`projectReorder.utils.ts`（落とす先の計算・範囲の外へ出たとき・並べ替え後の id の並び）
- ドラッグの配線（キャプチャ・window の登録・Esc）は、帯のドラッグと同じくブラウザでの手動確認とする

## 完了条件

- [ ] 案件名の左のアイコンをドラッグすると、同じ担当者の中で並べ替えられる
- [ ] 別の担当者の下へは移せない（その担当者の先頭・末尾で止まる）
- [ ] 左のリストと右のタイムライン（まとめ帯を含む）が同じ順に並ぶ
- [ ] 並び替えた結果が、再読み込みしても残る
- [ ] 新しく追加した案件・担当者を付け替えた案件は、その担当者の一番下に入る
- [ ] 既存のデータ（スキーマ 1）を読むと、今と同じ並び（開始日順）のまま `sortOrder` が付く
- [ ] `Esc` でドラッグを取り消せる。案件名のクリックでサイドパネルが開く動作は変わらない
- [ ] `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build` が成功する

## コミットの単位（目安）

1. `feat: 案件に並び順（sortOrder）を追加し、スキーマを移行`
2. `feat: 左のリストで案件をドラッグして並べ替えられるようにする`
