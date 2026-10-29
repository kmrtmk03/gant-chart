import { format } from "date-fns"

import { DRAG_THRESHOLD_PX } from "../../gantt.constants"
import {
  moveProjectDates,
  parseDateString,
  pxToDays,
  resizeProjectDates,
  type TProjectPeriod,
} from "../../gantt.utils"

/** ドラッグの種類。帯の中央をつかむと移動、左右の端をつかむと伸縮 */
export type TBarDragMode = "move" | "resize-start" | "resize-end"

/**
 * ドラッグ中の状態。ポインターを押してから離す（または取り消す）までの間だけ存在する。
 * MEMO: プランの `projectId` は持たない。状態は帯 1 本ごとのフック（`useBarDrag`）の中にあり、
 * どの案件の状態かは自明なため。
 */
export interface IBarDragState {
  mode: TBarDragMode
  /** ドラッグに使っているポインターの ID（他の指・ペンの動きを無視するため） */
  pointerId: number
  /** ドラッグ開始時のポインターの X 座標（clientX） */
  startClientX: number
  /** 現在の移動日数（`pxToDays` で 1 日単位に丸めた値） */
  deltaDays: number
  /** 移動量がしきい値（`DRAG_THRESHOLD_PX`）を一度でも超えたか。超えたら戻しても true のまま */
  isDragging: boolean
}

/**
 * ポインターを離したときに行うこと。
 * - click: しきい値未満で離した。クリックとして扱う（後続の click イベントでパネルを開く）
 * - unchanged: ドラッグしたが期間が元と同じ（元の位置に戻して離した）。保存しない
 * - commit: 期間が変わった。`period` を保存する
 */
export type TBarDragResult =
  | { type: "click" }
  | { type: "unchanged" }
  | { type: "commit"; period: TProjectPeriod }

/** ポインターを押したときの状態を作る */
export function startBarDrag(
  mode: TBarDragMode,
  pointerId: number,
  clientX: number,
): IBarDragState {
  return {
    mode,
    pointerId,
    startClientX: clientX,
    deltaDays: 0,
    isDragging: false,
  }
}

/**
 * ポインターが動いたときの状態を返す。
 * ドラッグしていない（null）ときや、別のポインターの動きのときは、受け取った状態をそのまま返す。
 */
export function updateBarDrag(
  state: IBarDragState | null,
  pointerId: number,
  clientX: number,
): IBarDragState | null {
  if (state === null || state.pointerId !== pointerId) return state

  const deltaPx = clientX - state.startClientX
  const isDragging = state.isDragging || Math.abs(deltaPx) >= DRAG_THRESHOLD_PX
  return { ...state, deltaDays: pxToDays(deltaPx), isDragging }
}

/**
 * ドラッグ中の仮の期間。しきい値を超えるまでは元の期間のまま。
 * 伸縮で開始日が終了日を越えないことは `resizeProjectDates` が保証する。
 */
export function getDraggedPeriod(
  period: TProjectPeriod,
  state: IBarDragState,
): TProjectPeriod {
  if (!state.isDragging || state.deltaDays === 0) return period
  if (state.mode === "move") return moveProjectDates(period, state.deltaDays)
  const edge = state.mode === "resize-start" ? "start" : "end"
  return resizeProjectDates(period, edge, state.deltaDays)
}

/** ポインターを離したときの結果を決める。`period` はドラッグ前の期間 */
export function getBarDragResult(
  period: TProjectPeriod,
  state: IBarDragState,
): TBarDragResult {
  if (!state.isDragging) return { type: "click" }
  const dragged = getDraggedPeriod(period, state)
  if (isSamePeriod(period, dragged)) return { type: "unchanged" }
  return { type: "commit", period: dragged }
}

/** 2 つの期間の開始日・終了日が同じか */
export function isSamePeriod(a: TProjectPeriod, b: TProjectPeriod): boolean {
  return a.startDate === b.startDate && a.endDate === b.endDate
}

/** ドラッグ中に帯の上に出す期間の表示（例: "10/3 〜 10/12"） */
export function formatBarPeriodLabel(period: TProjectPeriod): string {
  const formatMonthDay = (value: TProjectPeriod["startDate"]) =>
    format(parseDateString(value), "M/d")
  return `${formatMonthDay(period.startDate)} 〜 ${formatMonthDay(period.endDate)}`
}
