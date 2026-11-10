import type { TDateString } from "../../gantt.type"
import styles from "./TodayLine.module.scss"
import { useTodayLine } from "./useTodayLine"

interface ITodayLineProps {
  rangeStart: TDateString
  rangeDays: number
  today: TDateString
}

/** 今日の列の中央に引く縦線。今日が表示期間の外なら何も描かない */
export function TodayLine({ rangeStart, rangeDays, today }: ITodayLineProps) {
  const { lineLeft } = useTodayLine({ rangeStart, rangeDays, today })
  if (lineLeft === null) return null

  return <div className={styles.line} style={{ left: lineLeft }} aria-hidden />
}
