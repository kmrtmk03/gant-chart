import type { TDateString } from "../../gantt.type"
import styles from "./GanttHeader.module.scss"
import { useGanttHeader } from "./useGanttHeader"

interface IGanttHeaderProps {
  /** 画面の左端に見えている日付。表示中の年月の表示に使う */
  visibleDate: TDateString
  onScrollBackward: () => void
  onScrollForward: () => void
  onScrollToToday: () => void
  /** 完了済みの案件を表示しているか */
  isCompletedVisible: boolean
  /** 完了済みの案件の件数（ボタンに添える） */
  completedCount: number
  /** 完了済みの案件の表示 / 非表示を切り替える */
  onToggleCompletedVisible: () => void
}

/**
 * 画面上部のバー。タイトル、スクロールのボタン、表示中の年月を出し、
 * 右端に「完了済みを表示」の切り替えボタン（押されている状態を `aria-pressed` で伝える）を置く
 */
export function GanttHeader({
  visibleDate,
  onScrollBackward,
  onScrollForward,
  onScrollToToday,
  isCompletedVisible,
  completedCount,
  onToggleCompletedVisible,
}: IGanttHeaderProps) {
  const {
    rangeLabel,
    completedToggleLabel,
    completedToggleShortLabel,
    completedToggleClassName,
    completedToggleLabelClassName,
    completedToggleShortLabelClassName,
  } = useGanttHeader({ visibleDate, isCompletedVisible, completedCount })

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
      <span className={styles.range}>{rangeLabel}</span>
      <button
        type="button"
        className={completedToggleClassName}
        aria-pressed={isCompletedVisible}
        onClick={onToggleCompletedVisible}
      >
        {/* 文言は画面の幅で片方だけを出す（display: none の側は読み上げにも含まれない） */}
        <span className={completedToggleLabelClassName}>
          {completedToggleLabel}
        </span>
        <span className={completedToggleShortLabelClassName}>
          {completedToggleShortLabel}
        </span>
      </button>
    </header>
  )
}
