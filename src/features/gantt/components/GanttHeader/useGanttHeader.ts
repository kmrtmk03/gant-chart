import type { TDateString } from "../../gantt.type"
import { formatYearMonth } from "../../gantt.utils"
import {
  formatCompletedToggleLabel,
  formatCompletedToggleShortLabel,
} from "./ganttHeader.utils"
import styles from "./GanttHeader.module.scss"

interface IUseGanttHeaderParams {
  /** 画面の左端に見えている日付 */
  visibleDate: TDateString
  /** 完了済みの案件を表示しているか */
  isCompletedVisible: boolean
  /** 完了済みの案件の件数 */
  completedCount: number
}

/** `GanttHeader` 専用のフック。表示用の文字列と、切り替えボタンのクラス名を用意する */
export function useGanttHeader({
  visibleDate,
  isCompletedVisible,
  completedCount,
}: IUseGanttHeaderParams) {
  return {
    // 表示中の年月（例: "2026年10月"）
    rangeLabel: formatYearMonth(visibleDate),
    // 「完了済みを表示」の切り替えボタン（押されているときは主色の見た目にする）。
    // 狭い画面では短い文言に切り替える（どちらを出すかは CSS のメディアクエリで決める）
    completedToggleLabel: formatCompletedToggleLabel(completedCount),
    completedToggleShortLabel: formatCompletedToggleShortLabel(completedCount),
    completedToggleLabelClassName: styles.toggleLabel,
    completedToggleShortLabelClassName: styles.toggleShortLabel,
    completedToggleClassName: isCompletedVisible
      ? `${styles.completedToggle} ${styles.pressed}`
      : styles.completedToggle,
  }
}
