import { DRAG_THRESHOLD_PX } from "../gantt.constants"
import { moveIdToIndex } from "../gantt.utils"

// MEMO: ドラッグによる並び替え（`useDragReorder`）の状態遷移を、ポインターイベントから切り離した純粋関数にまとめる。
// 座標はすべて「ドラッグを始めた時点の画面の座標」にそろえる。ドラッグ中にスクロールしたときは、
// 呼び出し側（フック）がスクロールでずれた量を差し引いた Y 座標を渡す。

/** 行の縦の位置（getBoundingClientRect の top / bottom） */
export interface IRowRect {
  top: number
  bottom: number
}

/**
 * ドラッグ中の状態。つかみを押してから離す（または取り消す）までの間だけ存在する。
 * 行の位置は、つかんだ時点で測ったものを使い続ける（行の高さが違っても、測った値から落とす先を決める）
 */
export interface IDragReorderState {
  /** つかんでいる行の id */
  activeId: string
  /** ドラッグに使っているポインターの ID（2 本目の指の動きを無視するため） */
  pointerId: number
  /** ドラッグ開始時のポインターの Y 座標（clientY） */
  startClientY: number
  /** つかんだ時点の各行の位置。並びは id の並びと同じ */
  rowRects: IRowRect[]
  /** つかんだときの位置（id の並びの添字） */
  fromIndex: number
  /** 今のポインターの位置から求めた、落とす先の位置（0 〜 件数 - 1） */
  toIndex: number
  /**
   * つかんだ行をポインターに追従させる縦の移動量（px）。
   * 並べ替えられる範囲（先頭の行の上端〜末尾の行の下端）の外へは出さない
   */
  offsetY: number
  /** 移動量がしきい値（`DRAG_THRESHOLD_PX`）を一度でも超えたか。超えたら戻しても true のまま */
  isDragging: boolean
}

/**
 * ポインターを離したときに行うこと。
 * - click: しきい値未満で離した。何もしない
 * - unchanged: ドラッグしたが位置が元と同じ。保存しない
 * - commit: 位置が変わった。`orderedIds` を保存する
 */
export type TDragReorderResult =
  | { type: "click" }
  | { type: "unchanged" }
  | { type: "commit"; orderedIds: string[] }

/** 行に出す挿入位置の目印。before は行の上、after は行の下に線を引く */
export type TDropIndicator = "before" | "after" | null

/** つかみを押したときの状態を作る */
export function startDragReorder(
  activeId: string,
  pointerId: number,
  clientY: number,
  rowRects: IRowRect[],
  fromIndex: number,
): IDragReorderState {
  return {
    activeId,
    pointerId,
    startClientY: clientY,
    rowRects,
    fromIndex,
    toIndex: fromIndex,
    offsetY: 0,
    isDragging: false,
  }
}

/**
 * ポインターの位置から、落とす先の位置を求める。
 * つかんだ行を除いた各行のうち、中央がポインターより上にある行の数が、そのまま並べ替え後の位置になる。
 * 一番上の行より上・一番下の行より下に出ても、0 〜 件数 - 1 に収まる（先頭・末尾で止まる）。
 *
 * @param pointerY ドラッグを始めた時点の座標にそろえたポインターの Y 座標
 */
export function getDropIndex(
  rowRects: IRowRect[],
  fromIndex: number,
  pointerY: number,
): number {
  return rowRects.filter(
    (rect, index) =>
      index !== fromIndex && (rect.top + rect.bottom) / 2 < pointerY,
  ).length
}

/**
 * つかんだ行の移動量を、並べ替えられる範囲（先頭の行の上端〜末尾の行の下端）に収める。
 * 範囲の外へ出しても落とす先は先頭・末尾で止まるので、行もそこで止めて見た目をそろえる
 * （管理ダイアログの外へ出て見えなくなったり、別の担当者の行に重なったりしないようにする）
 */
export function clampDragOffset(
  rowRects: IRowRect[],
  fromIndex: number,
  offsetY: number,
): number {
  const activeRect = rowRects[fromIndex]
  const firstRect = rowRects[0]
  const lastRect = rowRects.at(-1)
  if (
    activeRect === undefined ||
    firstRect === undefined ||
    lastRect === undefined
  ) {
    return offsetY
  }
  const minOffset = firstRect.top - activeRect.top
  const maxOffset = lastRect.bottom - activeRect.bottom
  return Math.min(Math.max(offsetY, minOffset), maxOffset)
}

/**
 * ポインターが動いたときの状態を返す。
 * ドラッグしていない（null）ときや、別のポインターの動きのときは、受け取った状態をそのまま返す。
 * しきい値を超えるまでは、落とす先を元の位置のままにする（つかみをクリックしただけで並びを変えないため）。
 *
 * @param pointerY ドラッグを始めた時点の座標にそろえたポインターの Y 座標
 */
export function updateDragReorder(
  state: IDragReorderState | null,
  pointerId: number,
  pointerY: number,
): IDragReorderState | null {
  if (state === null || state.pointerId !== pointerId) return state

  const deltaY = pointerY - state.startClientY
  const isDragging = state.isDragging || Math.abs(deltaY) >= DRAG_THRESHOLD_PX
  const toIndex = isDragging
    ? getDropIndex(state.rowRects, state.fromIndex, pointerY)
    : state.fromIndex
  const offsetY = clampDragOffset(state.rowRects, state.fromIndex, deltaY)
  return { ...state, offsetY, isDragging, toIndex }
}

/** ポインターを離したときの結果を決める。`ids` はドラッグ前の id の並び */
export function getDragReorderResult(
  ids: string[],
  state: IDragReorderState,
): TDragReorderResult {
  if (!state.isDragging) return { type: "click" }
  if (state.toIndex === state.fromIndex) return { type: "unchanged" }
  const orderedIds = moveIdToIndex(ids, state.activeId, state.toIndex)
  if (orderedIds === null) return { type: "unchanged" }
  return { type: "commit", orderedIds }
}

/**
 * `index` 番目の行に出す挿入位置の目印を返す。
 * 落とす先が元の位置より下なら、落とす先の行の下に、上なら落とす先の行の上に線を出す。
 * ドラッグ前・元の位置のままのときは出さない。
 */
export function getDropIndicator(
  state: IDragReorderState | null,
  index: number,
): TDropIndicator {
  if (state === null || !state.isDragging) return null
  if (index !== state.toIndex || state.toIndex === state.fromIndex) return null
  return state.toIndex > state.fromIndex ? "after" : "before"
}
