import { DAY_COLUMN_WIDTH } from "../gantt.constants"
import { getTodayOffset } from "../gantt.utils"
import type { TDateString } from "../gantt.type"
import styles from "./TodayLine.module.scss"

interface ITodayLineProps {
  rangeStart: TDateString
  rangeDays: number
  today: TDateString
}

/** 今日の列の中央に引く縦線。今日が表示期間の外なら何も描かない */
export function TodayLine({ rangeStart, rangeDays, today }: ITodayLineProps) {
  const offset = getTodayOffset(rangeStart, rangeDays, today)
  if (offset === null) return null

  return (
    <div
      className={styles.line}
      style={{ left: offset + DAY_COLUMN_WIDTH / 2 }}
      aria-hidden
    />
  )
}
