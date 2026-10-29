import { memo } from "react"

import {
  DATE_HEADER_DAY_ROW_HEIGHT,
  DATE_HEADER_MONTH_ROW_HEIGHT,
  DAY_COLUMN_WIDTH,
} from "../gantt.constants"
import type { TDateString } from "../gantt.type"
import { getMonthSegments, type IDayColumn } from "../gantt.utils"
import styles from "./TimelineDateHeader.module.scss"

interface ITimelineDateHeaderProps {
  columns: IDayColumn[]
  today: TDateString
}

/**
 * タイムライン上部の日付ヘッダー（月の行と日の行の 2 段）。縦スクロールしても上に固定する。
 * 土日祝は文字色を変え、祝日名は `title` で出す。
 */
export const TimelineDateHeader = memo(function TimelineDateHeader({
  columns,
  today,
}: ITimelineDateHeaderProps) {
  return (
    <div className={styles.header}>
      <div
        className={styles.row}
        style={{ height: DATE_HEADER_MONTH_ROW_HEIGHT }}
      >
        {getMonthSegments(columns).map((segment) => (
          <div
            key={segment.key}
            className={styles.month}
            style={{ width: segment.days * DAY_COLUMN_WIDTH }}
          >
            {segment.label}
          </div>
        ))}
      </div>
      <div
        className={styles.row}
        style={{ height: DATE_HEADER_DAY_ROW_HEIGHT }}
      >
        {columns.map((column) => {
          const classNames = [styles.day]
          if (column.isWeekend) classNames.push(styles.weekend)
          if (column.holidayName !== null) classNames.push(styles.holiday)
          if (column.date === today) classNames.push(styles.today)
          return (
            <div
              key={column.date}
              className={classNames.join(" ")}
              style={{ width: DAY_COLUMN_WIDTH }}
              title={column.holidayName ?? undefined}
            >
              {Number(column.date.slice(8, 10))}
            </div>
          )
        })}
      </div>
    </div>
  )
})
