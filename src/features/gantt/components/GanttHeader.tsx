import { formatYearMonth } from "../gantt.utils"
import type { TDateString } from "../gantt.type"
import styles from "./GanttHeader.module.scss"

interface IGanttHeaderProps {
  /** 画面の左端に見えている日付。表示中の年月の表示に使う */
  visibleDate: TDateString
  onScrollBackward: () => void
  onScrollForward: () => void
  onScrollToToday: () => void
}

/** 画面上部のバー。タイトル、スクロールのボタン、表示中の年月を出す */
export function GanttHeader({
  visibleDate,
  onScrollBackward,
  onScrollForward,
  onScrollToToday,
}: IGanttHeaderProps) {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>ガントチャート</h1>
      <div className={styles.controls}>
        <button type="button" onClick={onScrollBackward} aria-label="前へ">
          ◀
        </button>
        <button type="button" onClick={onScrollToToday}>
          今日
        </button>
        <button type="button" onClick={onScrollForward} aria-label="次へ">
          ▶
        </button>
      </div>
      <span className={styles.range}>{formatYearMonth(visibleDate)}</span>
    </header>
  )
}
