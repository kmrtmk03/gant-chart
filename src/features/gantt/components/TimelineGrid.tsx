import { DAY_COLUMN_WIDTH } from "../gantt.constants"
import type { IDayColumn } from "../gantt.utils"
import styles from "./TimelineGrid.module.scss"

interface ITimelineGridProps {
  columns: IDayColumn[]
}

/** タイムラインの背景の縦線。土日祝の列には背景色を付ける。操作は受け付けない */
export function TimelineGrid({ columns }: ITimelineGridProps) {
  return (
    <div className={styles.grid} aria-hidden>
      {columns.map((column) => {
        const classNames = [styles.column]
        if (column.holidayName !== null) {
          classNames.push(styles.holiday)
        } else if (column.isWeekend) {
          classNames.push(styles.weekend)
        }
        return (
          <div
            key={column.date}
            className={classNames.join(" ")}
            style={{ width: DAY_COLUMN_WIDTH }}
          />
        )
      })}
    </div>
  )
}
