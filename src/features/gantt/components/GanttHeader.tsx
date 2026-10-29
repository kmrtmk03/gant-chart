import { addDays, formatYearMonth } from "../gantt.utils"
import type { TDateString } from "../gantt.type"
import styles from "./GanttHeader.module.scss"

interface IGanttHeaderProps {
  /** 表示期間の最初の日 */
  rangeStart: TDateString
  rangeDays: number
  onShiftBackward: () => void
  onShiftForward: () => void
  onResetToToday: () => void
}

/** 画面上部のバー。タイトル、表示期間の移動ボタン、表示中の年月を出す */
export function GanttHeader({
  rangeStart,
  rangeDays,
  onShiftBackward,
  onShiftForward,
  onResetToToday,
}: IGanttHeaderProps) {
  const startLabel = formatYearMonth(rangeStart)
  const endLabel = formatYearMonth(addDays(rangeStart, rangeDays - 1))
  const rangeLabel =
    startLabel === endLabel ? startLabel : `${startLabel} 〜 ${endLabel}`

  return (
    <header className={styles.header}>
      <h1 className={styles.title}>ガントチャート</h1>
      <div className={styles.controls}>
        <button type="button" onClick={onShiftBackward} aria-label="前へ">
          ◀
        </button>
        <button type="button" onClick={onResetToToday}>
          今日
        </button>
        <button type="button" onClick={onShiftForward} aria-label="次へ">
          ▶
        </button>
      </div>
      <span className={styles.range}>{rangeLabel}</span>
    </header>
  )
}
