import { DAY_COLUMN_WIDTH } from "../gantt.constants"
import type { IProject, TDateString } from "../gantt.type"
import { addDays, diffInDays, getToday } from "./date.utils"

// タイムライン上の座標（帯の位置・幅、今日の線の位置）と、ドラッグによる期間の移動・伸縮の計算。
// 日付そのものの計算は date.utils.ts に任せ、ここは「日付 ↔ px」の変換と帯の期間の操作だけを持つ。

/** 帯の左右どちらの端を動かすか */
export type TBarEdge = "start" | "end"

/** 帯の描画位置。`getBarLayout` の戻り値 */
export interface IBarLayout {
  /** 表示期間の左端からの距離（px） */
  left: number
  /** 帯の幅（px）。表示期間からはみ出す部分は含めない */
  width: number
  /** 開始日が表示期間より前で、左側が切れているか */
  isClippedStart: boolean
  /** 終了日が表示期間より後で、右側が切れているか */
  isClippedEnd: boolean
}

/** 案件の期間（開始日・終了日）だけを取り出した型。移動・伸縮の計算結果にも使う */
export type TProjectPeriod = Pick<IProject, "startDate" | "endDate">

/**
 * 案件の期間が表示期間と 1 日でも重なるか。両方とも端の日を含む。
 * "YYYY-MM-DD" は文字列のまま大小比較しても日付順になる。
 */
export function isRangeOverlapping(
  projectStart: TDateString,
  projectEnd: TDateString,
  rangeStart: TDateString,
  rangeEnd: TDateString,
): boolean {
  return projectStart <= rangeEnd && projectEnd >= rangeStart
}

/**
 * 帯の位置と幅を求める。表示期間からはみ出す部分は切り詰め、どちら側が切れたかも返す。
 * 表示期間にまったく入らない案件は null（帯を描かない）。
 *
 * @param rangeStart 表示期間の最初の日
 * @param rangeDays 表示期間の日数
 */
export function getBarLayout(
  project: TProjectPeriod,
  rangeStart: TDateString,
  rangeDays: number,
): IBarLayout | null {
  // 表示期間の先頭を 0 とした、開始日・終了日の列番号
  const startIndex = diffInDays(rangeStart, project.startDate)
  const endIndex = diffInDays(rangeStart, project.endDate)

  // 表示期間内に収まる列の範囲（両端を含む）
  const visibleStartIndex = Math.max(startIndex, 0)
  const visibleEndIndex = Math.min(endIndex, rangeDays - 1)
  if (visibleStartIndex > visibleEndIndex) return null

  return {
    left: visibleStartIndex * DAY_COLUMN_WIDTH,
    width: (visibleEndIndex - visibleStartIndex + 1) * DAY_COLUMN_WIDTH,
    isClippedStart: startIndex < 0,
    isClippedEnd: endIndex > rangeDays - 1,
  }
}

/**
 * 今日の列の左端の位置（px）。表示期間の外なら null（線を描かない）。
 * 線を列の中央に引きたいときは、呼び出し側で `DAY_COLUMN_WIDTH / 2` を足す。
 *
 * @param today テスト用。省略すると実際の今日を使う
 */
export function getTodayOffset(
  rangeStart: TDateString,
  rangeDays: number,
  today: TDateString = getToday(),
): number | null {
  const index = diffInDays(rangeStart, today)
  if (index < 0 || index >= rangeDays) return null
  return index * DAY_COLUMN_WIDTH
}

/**
 * ドラッグの移動量（px）を日数に変換する。列幅の半分以上動いたら 1 日動いたとみなす。
 * ちょうど半分のときは、左右どちらでも絶対値が大きい側（0 から遠い側）にそろえる。
 */
export function pxToDays(deltaPx: number): number {
  const days = Math.round(Math.abs(deltaPx) / DAY_COLUMN_WIDTH)
  // Math.sign(0) * 0 や -0 を避けるため、0 のときは 0 を返す
  return days === 0 ? 0 : Math.sign(deltaPx) * days
}

/** 期間の長さを保ったまま `days` 日動かした後の開始日・終了日 */
export function moveProjectDates(
  project: TProjectPeriod,
  days: number,
): TProjectPeriod {
  return {
    startDate: addDays(project.startDate, days),
    endDate: addDays(project.endDate, days),
  }
}

/**
 * 帯の片端を `days` 日動かした後の開始日・終了日。
 * 反対側の端は動かさず、開始日 ≦ 終了日（最短 1 日）を保つ。追い越しそうなときは反対側の端で止める。
 */
export function resizeProjectDates(
  project: TProjectPeriod,
  edge: TBarEdge,
  days: number,
): TProjectPeriod {
  if (edge === "start") {
    const movedStart = addDays(project.startDate, days)
    return {
      startDate: movedStart > project.endDate ? project.endDate : movedStart,
      endDate: project.endDate,
    }
  }

  const movedEnd = addDays(project.endDate, days)
  return {
    startDate: project.startDate,
    endDate: movedEnd < project.startDate ? project.startDate : movedEnd,
  }
}
