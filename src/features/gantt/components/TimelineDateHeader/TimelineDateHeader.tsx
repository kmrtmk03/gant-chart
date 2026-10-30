import { memo } from "react"

import type { TDateString } from "../../gantt.type"
import type { IDayColumn } from "../../gantt.utils"
import styles from "./TimelineDateHeader.module.scss"
import { useTimelineDateHeader } from "./useTimelineDateHeader"

interface ITimelineDateHeaderProps {
  columns: IDayColumn[]
  today: TDateString
}

/**
 * タイムライン上部の日付ヘッダー（月の行と日の行の 2 段）。縦スクロールしても上に固定する。
 * 土曜は青、日曜と祝日は赤の文字色にし、祝日名は `title` で出す。
 */
export const TimelineDateHeader = memo(function TimelineDateHeader({
  columns,
  today,
}: ITimelineDateHeaderProps) {
  const { monthRowHeight, months, dayRowHeight, days } = useTimelineDateHeader({
    columns,
    today,
  })

  return (
    <div className={styles.header}>
      <div className={styles.row} style={{ height: monthRowHeight }}>
        {months.map((month) => (
          <div
            key={month.key}
            className={month.className}
            style={{ width: month.width }}
          >
            {month.label}
          </div>
        ))}
      </div>
      <div className={styles.row} style={{ height: dayRowHeight }}>
        {days.map((day) => (
          <div
            key={day.key}
            className={day.className}
            style={{ width: day.width }}
            title={day.title}
          >
            {day.label}
          </div>
        ))}
      </div>
    </div>
  )
})
