# フェーズ 9: 案件・担当者のドラッグによる並び替え

- 全体プラン: [1-gantt-chart-mvp.md](1-gantt-chart-mvp.md)
- 担当: **Opus 5.5**（データ構造の変更とスキーマの移行、ポインター操作によるドラッグを含むため）
- ブランチ: `feat/gantt-drag-reorder`
- 前提: フェーズ 8 が完了している（帯のドラッグと同じ Pointer Events の作りに合わせるため）

## 目的

案件と担当者の並び順を、ドラッグ＆ドロップで自由に決められるようにする。

- **案件**: 今は開始日順（`groupProjectsByMember` で並べている）に固定されている。左のリストの案件名の左側に「つかみ」のアイコンを置き、それをドラッグして並べ替える。並べ替えられる範囲は**同じ担当者の中だけ**で、別の担当者の下へは移せない（担当者の付け替えは、これまでどおりサイドパネルで行う）
- **担当者**: 今は「担当者を管理」ダイアログの ↑ / ↓ ボタンで並べ替えている。これを**ドラッグに置き換える**（↑ / ↓ ボタンは削除する）。つかみのアイコンは、案件のリストに合わせて行の左端（名前の入力欄の左）に置く
- どちらも並び順は保存し、再読み込みしても残る。右のタイムラインの行も同じ順に並ぶ

## 作業内容

### 1. データ層（案件の並び順の保存）

担当者には `sortOrder` と `reorderMembers` がすでにあるので、データ層の変更は案件だけ。

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

### 3. ドラッグで並べ替える共通のフック（`useDragReorder`）

案件のリストと担当者の管理ダイアログの 2 か所で使うため、feature 共通の `hooks/useDragReorder.ts` に置く。並べる対象（案件・担当者）は知らず、「id の並びの中で 1 つを動かす」ことだけを受け持つ。

- 引数（例）: 並んでいる id の配列、離したときに呼ぶ `onReorder(orderedIds)`、無効にするか（`isDisabled`）
- 戻り値（例）: つかみに渡す `pointerdown` のハンドラ、行の要素を登録する ref のコールバック、ドラッグ中の状態（つかんでいる id・落とす先の位置）、描画用の並び（ドラッグ中・保存中は変更後の並び）
- Pointer Events（`pointerdown` / `pointermove` / `pointerup` / `pointercancel`）で実装する。**ライブラリは使わない**（帯のドラッグと同じ方針）
- `pointerdown` はつかみのアイコンだけで受け、`setPointerCapture` する。`pointermove` 以降は、帯のドラッグと同じくドラッグ中だけ `window` に登録し、同じ `useEffect` で解除する
- ドラッグ中の状態（例）
  ```ts
  interface IDragReorderState {
    activeId: string // つかんでいる行の id
    pointerId: number // 2 本目の指の動きを無視するため
    startClientY: number
    rowRects: IRowRect[] // つかんだ時点の各行の上端・下端（getBoundingClientRect）
    fromIndex: number // つかんだときの位置
    toIndex: number // 今のポインター位置から求めた、落とす先の位置
    isDragging: boolean // しきい値（DRAG_THRESHOLD_PX）を超えたら true
  }
  ```
- 落とす先の位置は、**つかんだ時点で測った各行の位置**（上端・下端）と今のポインターの位置から求め、0 〜 件数 - 1 に収める。管理ダイアログの行はエラー・警告の表示で高さが変わるため、行の高さの定数で割る方式にはしない。ドラッグ中に画面がスクロールしたときのずれは、測り直すか、スクロール量を足して補正する（実装時に決める）
- 計算（落とす先の位置・並べ替え後の id の並び）は純粋関数にしてテストする。既存の `moveId`（↑ / ↓ 用）は使わなくなるので、置き換えた関数（例: `moveIdToIndex(ids, id, toIndex)`）を `gantt.utils.ts` に置き、`moveId` / `TMoveDirection` とそのテストは削除する
- 離したとき、位置が変わっていれば `onReorder` を 1 回だけ呼ぶ。保存中は変更後の並びで描き、失敗したら元の並びに戻す（エラーの出し方は呼び出し側が決める）
- `pointercancel` と `Esc` では取り消して元に戻す。Esc は帯のドラッグと同じく window のキャプチャ段階で受けて `stopPropagation` / `preventDefault` する（サイドパネルの Esc や、管理ダイアログ（`<dialog>`）が Esc で閉じるのを防ぐため。ダイアログが閉じないことはブラウザで確認する）
- つかみをクリックした（しきい値未満で離した）ときは何もしない

### 4. 案件の並び替え（左のリスト）

- `useProjects` に `reorderProjects(memberId, orderedIds)` を足す。ほかの操作と同じく、保存が成功してから state を更新し、失敗は例外のまま投げる
- `useGanttPage` で `projectReorder` のようなグループにまとめて公開する。保存の失敗は、帯のドラッグの `barDrag.error` と同じく左下のお知らせに出す
- `useDragReorder` は担当者 1 人ぶんの案件ごとに使う（並べ替えの範囲が担当者の中に限られるため。範囲の外へ出ても、その担当者の先頭・末尾で止まる）
- 見た目（`MemberList`）
  - 案件の行の左端（案件名の左、色の丸の手前）に、つかみのアイコン（縦の点 6 つ `⋮⋮` など）を置く
  - カーソルは `grab`、ドラッグ中は `grabbing`。`touch-action: none` にして、タッチでもスクロールではなくドラッグになるようにする
  - `aria-label`（例: 「案件A の並び順を変更」）を付ける
  - 案件が 1 件だけの担当者でもアイコンは出す（動かせないだけ）。見た目をそろえるため
  - ドラッグ中は、つかんでいる行を少し浮かせて（影・透明度）ポインターに追従させ、落とす先に横線（挿入位置の目印）を出す
  - 右のタイムラインは**離して保存するまで並びを変えない**（ドラッグ中に `Timeline` 全体を再描画しないため。帯のドラッグと同じ考え方）
- つかみ以外（案件名のボタン）のクリックは、これまでどおりサイドパネルを開く
- 担当者が折りたたまれているときは案件の行がないので、並び替えもできない

### 5. 担当者の並び替え（管理ダイアログ）

- `MemberManageRow` の ↑ / ↓ ボタンを削除し、行の左端（名前の入力欄の左）につかみのアイコンを置く。アイコン・カーソル・ドラッグ中の見た目は、案件のリストと同じにする（同じ見た目が 2 か所に出るので、つかみのアイコンは小さなコンポーネント（例: `DragHandle`）に切り出す）
  - `aria-label` は「田中 の並び順を変更」のようにする
- `MemberManageDialog` で `useDragReorder` を使い、離したら `reorderMembers` に全 id を渡す
  - `useMemberManagement` の `moveMember(id, direction)` は、並べ替え後の全 id を受け取る形（例: `reorderMembers(orderedIds)`）に置き換える
  - 保存はダイアログのほかの操作と同じく `runAction` を通す（1 つずつ実行し、失敗は `actionError` としてダイアログ内に出す）。保存中（`isBusy`）はドラッグを始められないようにする
  - `MemberManageRow` の props の `isFirst` / `isLast` / `onMove` は不要になるので外す
- 名前の入力欄を編集中につかみを押した場合は、入力欄の blur で名前の保存が先に走る。保存中はドラッグを始められないので、このときは一度離してからもう一度つかむことになる（実際に操作してみて、気になるようなら対処を考える）
- 左のリストの担当者の並びは、ダイアログでの保存後に変わる（今の ↑ / ↓ と同じ）

### 6. テスト

- 型ガード（`sortOrder`）、repository（`reorderProjects` の正常系・id の過不足・存在しない担当者、`createProject` / `updateProject` の `sortOrder`、スキーマの移行）、`groupProjectsByMember` の並び、ドラッグの計算（落とす先の位置・範囲の外へ出たとき・高さの違う行・並べ替え後の id の並び）
- ドラッグの配線（キャプチャ・window の登録・Esc）は、帯のドラッグと同じくブラウザでの手動確認とする

## 完了条件

- [ ] 案件名の左のアイコンをドラッグすると、同じ担当者の中で並べ替えられる
- [ ] 案件は別の担当者の下へは移せない（その担当者の先頭・末尾で止まる）
- [ ] 左のリストと右のタイムライン（まとめ帯を含む）が同じ順に並ぶ
- [ ] 担当者の管理ダイアログで、名前の左のアイコンをドラッグして担当者を並べ替えられる。↑ / ↓ ボタンはなくなっている
- [ ] 並び替えた結果（案件・担当者とも）が、再読み込みしても残る
- [ ] 新しく追加した案件・担当者を付け替えた案件は、その担当者の一番下に入る
- [ ] 既存のデータ（スキーマ 1）を読むと、今と同じ並び（開始日順）のまま `sortOrder` が付く
- [ ] `Esc` でドラッグを取り消せる（管理ダイアログも閉じない）。案件名のクリックでサイドパネルが開く動作は変わらない
- [ ] `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build` が成功する

## コミットの単位（目安）

1. `feat: 案件に並び順（sortOrder）を追加し、スキーマを移行`
2. `feat: 左のリストで案件をドラッグして並べ替えられるようにする`
3. `feat: 担当者の管理ダイアログの並び替えをドラッグに変更`
