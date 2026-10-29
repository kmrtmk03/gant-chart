"use client"

import {
  DATE_HEADER_DAY_ROW_HEIGHT,
  DATE_HEADER_MONTH_ROW_HEIGHT,
  DAY_COLUMN_WIDTH,
  MEMBER_LIST_WIDTH,
} from "../gantt.constants"
import { useGanttPage } from "../hooks/useGanttPage"
import styles from "./GanttChart.module.scss"
import { GanttHeader } from "./GanttHeader"
import { MemberList } from "./MemberList"
import { ProjectSidePanel } from "./ProjectSidePanel"
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
  const { memberGroups, range, sidePanel } = page
  const {
    attachScroller,
    handleScroll,
    visibleDate,
    scrollBackward,
    scrollForward,
    scrollToToday,
  } = page.scroll

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
    range.today === null ||
    range.columns === null
  ) {
    return <p className={styles.message}>読み込み中…</p>
  }

  const { rangeStart, rangeDays, today, columns } = range
  const headerHeight = DATE_HEADER_MONTH_ROW_HEIGHT + DATE_HEADER_DAY_ROW_HEIGHT

  // サイドパネルを出すか。追加のときは常に出し、編集のときは案件が見つかるときだけ出す。
  // key は、別の案件・別の担当者で開き直したときにフォームを作り直すためのもの
  const { state: sidePanelState, editingProject } = sidePanel
  const isSidePanelVisible =
    sidePanelState.mode === "create" ||
    (sidePanelState.mode === "edit" && editingProject !== null)
  const sidePanelKey =
    sidePanelState.mode === "create"
      ? `create:${sidePanelState.defaultMemberId ?? ""}`
      : `edit:${editingProject?.id ?? ""}`

  return (
    <div className={styles.root}>
      <GanttHeader
        visibleDate={visibleDate ?? today}
        onScrollBackward={scrollBackward}
        onScrollForward={scrollForward}
        onScrollToToday={scrollToToday}
      />

      {memberGroups.length === 0 ? (
        <div className={styles.empty}>
          <p>まず担当者を追加してください</p>
          <button type="button" onClick={page.manageMembers}>
            担当者を管理
          </button>
          {page.canSeedSampleData && (
            <button
              type="button"
              disabled={page.isSeeding}
              onClick={page.seedSampleData}
            >
              サンプルデータを入れる（開発用）
            </button>
          )}
          {page.seedError && (
            <p role="alert">
              サンプルデータを入れられませんでした。{page.seedError.message}
            </p>
          )}
        </div>
      ) : (
        <div
          ref={attachScroller}
          className={styles.scroller}
          onScroll={handleScroll}
        >
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
              editingProjectId={editingProject?.id ?? null}
              onSelectProject={sidePanel.selectProject}
            />
          </div>
        </div>
      )}

      {isSidePanelVisible && (
        <ProjectSidePanel
          key={sidePanelKey}
          members={sidePanel.members}
          project={editingProject}
          defaultMemberId={
            sidePanelState.mode === "create"
              ? sidePanelState.defaultMemberId
              : null
          }
          today={today}
          onSubmit={sidePanel.save}
          onDelete={sidePanel.remove}
          onClose={sidePanel.close}
        />
      )}
    </div>
  )
}
