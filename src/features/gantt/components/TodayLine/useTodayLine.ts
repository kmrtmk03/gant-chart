import { DAY_COLUMN_WIDTH } from "../../gantt.constants"
import type { TDateString } from "../../gantt.type"
import { getTodayOffset } from "../../gantt.utils"

interface IUseTodayLineParams {
  rangeStart: TDateString
  rangeDays: number
  today: TDateString
}

/**
 * `TodayLine` 専用のフック。今日の列の中央の位置（px）を求める。
 * 今日が表示期間の外なら `lineLeft` は null になる（呼び出し側は何も描かないこと）。
 */
export function useTodayLine({
  rangeStart,
  rangeDays,
  today,
}: IUseTodayLineParams) {
  const offset = getTodayOffset(rangeStart, rangeDays, today)

  return {
    // getTodayOffset は列の左端を返すので、列の中央にするため半分の幅を足す
    lineLeft: offset === null ? null : offset + DAY_COLUMN_WIDTH / 2,
  }
}
