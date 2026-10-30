import {
  DATE_HEADER_DAY_ROW_HEIGHT,
  DATE_HEADER_MONTH_ROW_HEIGHT,
  DAY_COLUMN_WIDTH,
} from "../../gantt.constants"
import type { TDateString } from "../../gantt.type"
import { getMonthSegments, type IDayColumn } from "../../gantt.utils"
import styles from "./TimelineDateHeader.module.scss"

interface IUseTimelineDateHeaderParams {
  columns: IDayColumn[]
  today: TDateString
}

/**
 * `TimelineDateHeader` 専用のフック。月の行・日の行に出す値（幅・ラベル・クラス名）を求める。
 * 土日祝と今日は、日のセルのクラス名で見た目を切り替える。
 */
export function useTimelineDateHeader({
  columns,
  today,
}: IUseTimelineDateHeaderParams) {
  // 表示期間の最初の月は途中から始まることがあるので、最初の列が 1 日のときだけ区切り線を引く
  const months = getMonthSegments(columns).map((segment, index) => ({
    key: segment.key,
    label: segment.label,
    width: segment.days * DAY_COLUMN_WIDTH,
    className:
      index > 0 || columns[0]?.isMonthStart
        ? `${styles.month} ${styles.monthStart}`
        : styles.month,
  }))

  const days = columns.map((column) => {
    const classNames = [styles.day]
    if (column.isSaturday) classNames.push(styles.saturday)
    else if (column.isWeekend) classNames.push(styles.holiday)
    if (column.holidayName !== null) classNames.push(styles.holiday)
    if (column.isMonthStart) classNames.push(styles.monthStart)
    if (column.date === today) classNames.push(styles.today)
    return {
      key: column.date,
      className: classNames.join(" "),
      width: DAY_COLUMN_WIDTH,
      // 祝日名はツールチップで出す
      title: column.holidayName ?? undefined,
      // "YYYY-MM-DD" の日の部分（先頭の 0 は付けない）
      label: Number(column.date.slice(8, 10)),
    }
  })

  return {
    // 月の行
    monthRowHeight: DATE_HEADER_MONTH_ROW_HEIGHT,
    months,
    // 日の行
    dayRowHeight: DATE_HEADER_DAY_ROW_HEIGHT,
    days,
  }
}
