"use client"

import {
  DATE_HEADER_DAY_ROW_HEIGHT,
  DATE_HEADER_MONTH_ROW_HEIGHT,
  DAY_COLUMN_WIDTH,
  MEMBER_LIST_WIDTH,
} from "../gantt.constants"
import { getDayColumns } from "../gantt.utils"
import { useGanttPage } from "../hooks/useGanttPage"
import styles from "./GanttChart.module.scss"
import { GanttHeader } from "./GanttHeader"
import { MemberList } from "./MemberList"
import { Timeline } from "./Timeline"
import { TimelineDateHeader } from "./TimelineDateHeader"

/**
 * ガントチャート画面の最上位コンポーネント。`page.tsx` に 1 つだけ置く。
 *
 * 左のリストと右のタイムラインは「1 つのスクロール領域」の中に左右に並べる。
 * 縦横のスクロール位置が自然にそろい、JavaScript での同期が要らない。
 * - 日付ヘッダー（右上）は `position: sticky; top: 0`
 * - 左のリストは `position: sticky; left: 0`
 * - 左上の角は両方向に固定する
 */
export function GanttChart() {
  const page = useGanttPage()
  const { memberGroups, range } = page

  if (page.loadError) {
    return (
      <p className={styles.message} role="alert">
        データを読み込めませんでした。{page.loadError.message}
      </p>
    )
  }

  // localStorage と今日の日付はブラウザでしか決まらないので、揃うまでは読み込み中を出す
  if (
    memberGroups === null ||
    range.rangeStart === null ||
    range.today === null
  ) {
    return <p className={styles.message}>読み込み中…</p>
  }

  const { rangeStart, rangeDays, today } = range
  const columns = getDayColumns(rangeStart, rangeDays)
  const headerHeight = DATE_HEADER_MONTH_ROW_HEIGHT + DATE_HEADER_DAY_ROW_HEIGHT

  return (
    <div className={styles.root}>
      <GanttHeader
        rangeStart={rangeStart}
        rangeDays={rangeDays}
        onShiftBackward={range.shiftBackward}
        onShiftForward={range.shiftForward}
        onResetToToday={range.resetToToday}
      />

      {memberGroups.length === 0 ? (
        <div className={styles.empty}>
          <p>まず担当者を追加してください</p>
          <button type="button" onClick={page.manageMembers}>
            担当者を管理
          </button>
          {page.canSeedSampleData && (
            <button type="button" onClick={page.seedSampleData}>
              サンプルデータを入れる（開発用）
            </button>
          )}
        </div>
      ) : (
        <div className={styles.scroller}>
          <div
            className={styles.grid}
            style={{
              gridTemplateColumns: `${MEMBER_LIST_WIDTH}px ${rangeDays * DAY_COLUMN_WIDTH}px`,
            }}
          >
            <div className={styles.corner} style={{ height: headerHeight }} />
            <TimelineDateHeader columns={columns} today={today} />
            <MemberList
              memberGroups={memberGroups}
              collapsedMemberIds={page.collapsedMemberIds}
              onToggleMember={page.toggleMember}
              onAddProject={page.addProject}
              onManageMembers={page.manageMembers}
            />
            <Timeline
              memberGroups={memberGroups}
              collapsedMemberIds={page.collapsedMemberIds}
              columns={columns}
              rangeStart={rangeStart}
              rangeDays={rangeDays}
              today={today}
            />
          </div>
        </div>
      )}
    </div>
  )
}
