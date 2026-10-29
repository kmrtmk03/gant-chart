import type { TDateString } from "../../gantt.type"
import { formatYearMonth } from "../../gantt.utils"

interface IUseGanttHeaderParams {
  /** 画面の左端に見えている日付 */
  visibleDate: TDateString
}

/** `GanttHeader` 専用のフック。表示用の文字列を用意する */
export function useGanttHeader({ visibleDate }: IUseGanttHeaderParams) {
  return {
    // 表示中の年月（例: "2026年10月"）
    rangeLabel: formatYearMonth(visibleDate),
  }
}
