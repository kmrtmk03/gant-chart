import { DAY_COLUMN_WIDTH } from "../../gantt.constants"
import type { IDayColumn } from "../../gantt.utils"
import styles from "./TimelineGrid.module.scss"

interface IUseTimelineGridParams {
  columns: IDayColumn[]
}

/**
 * `TimelineGrid` 専用のフック。日ごとの列のクラス名と幅を求める。
 * 祝日は土日より優先して色を付ける（祝日の土日は祝日の色にする）。
 */
export function useTimelineGrid({ columns }: IUseTimelineGridParams) {
  const gridColumns = columns.map((column) => {
    const classNames = [styles.column]
    if (column.holidayName !== null) {
      classNames.push(styles.holiday)
    } else if (column.isWeekend) {
      classNames.push(styles.weekend)
    }
    return {
      key: column.date,
      className: classNames.join(" "),
      width: DAY_COLUMN_WIDTH,
    }
  })

  return { gridColumns }
}
