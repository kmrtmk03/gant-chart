# フェーズ 8: 帯のドラッグ移動・伸縮

- 全体プラン: [1-gantt-chart-mvp.md](1-gantt-chart-mvp.md)
- 担当: **Opus 5.5**（ポインター操作・クリックとの区別・保存のタイミングなど、状態の扱いが難しいため）
- ブランチ: `feat/gantt-bar-drag`
- 前提: フェーズ 6 が完了している（帯のクリックでパネルを開く処理と共存させるため）

## 目的

帯をドラッグして期間を移動、左右の端をドラッグして期間を伸縮できるようにする。1 日単位で吸着させる。

## 作業内容

### 1. フック（`useBarDrag`）

- Pointer Events（`pointerdown` / `pointermove` / `pointerup` / `pointercancel`）で実装する。マウスとタッチを同じ処理で扱うため
- `pointerdown` で `setPointerCapture` を使い、帯の外にポインターが出ても追従させる
- ドラッグ中の状態
  ```ts
  interface IDragState {
    projectId: string
    mode: "move" | "resize-start" | "resize-end"
    startClientX: number // ドラッグ開始時のポインター位置
    deltaDays: number // 現在の移動日数（pxToDays で計算）
    isDragging: boolean // しきい値を超えたら true
  }
  ```
- ドラッグ中は**保存せず**、`deltaDays` から計算した仮の期間で帯を描く（フェーズ 4 の `moveProjectDates` / `resizeProjectDates` を使う）
- `pointerup` で期間が変わっていれば `updateProject` で 1 回だけ保存する。保存に失敗したら元の位置に戻し、エラーを表示する
- `pointercancel` と `Esc` キーではドラッグを取り消して元に戻す
- 登録したイベントは、同じ処理の中で必ず解除する

### 2. クリックとの区別

- 移動量が `DRAG_THRESHOLD_PX` 未満で離したときだけ「クリック」とみなし、サイドパネルを開く
- しきい値を超えた場合は、ドラッグ終了後のクリックイベントでパネルが開かないようにする

### 3. 見た目（`ProjectBar`）

- 帯の左右の端（各 6px 程度）を伸縮用のつかみにし、カーソルを `ew-resize` にする。中央は `grab` / ドラッグ中は `grabbing`
- 1 日だけの短い帯でも、移動用の中央部分が残るようにつかみの幅を調整する
- ドラッグ中は帯の上に変更後の期間（例: `10/3 〜 10/12`）を小さく表示する
- 表示期間の外にはみ出している側の端は伸縮できないようにする

### 4. テスト

- 計算部分（フェーズ 4 の関数）はテスト済み。このフェーズでは `useBarDrag` の状態遷移を、ポインターイベントの順番を変えながら確認する（Vitest + jsdom。難しければ手動確認の項目を厚くし、その旨を報告する）

## 完了条件

- [ ] 帯をドラッグすると 1 日単位で吸着しながら移動し、離すと保存される
- [ ] 左右の端をドラッグすると伸縮でき、開始日が終了日を越えない
- [ ] 小さな移動で離すとクリック扱いになり、サイドパネルが開く
- [ ] ドラッグのあとにサイドパネルが勝手に開かない
- [ ] `Esc` でドラッグを取り消せる
- [ ] 再読み込みしても変更が残る
- [ ] `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build` が成功する

## コミットの単位（目安）

1. `feat: 帯のドラッグによる移動と伸縮を追加`
