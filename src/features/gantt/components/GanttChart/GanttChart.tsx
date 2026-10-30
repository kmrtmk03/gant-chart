"use client"

import { GanttHeader } from "../GanttHeader"
import { MemberList } from "../MemberList"
import { MemberManageDialog } from "../MemberManageDialog"
import { ProjectSidePanel } from "../ProjectSidePanel"
import { Timeline } from "../Timeline"
import { TimelineDateHeader } from "../TimelineDateHeader"
import styles from "./GanttChart.module.scss"
import { useGanttChart } from "./useGanttChart"

/**
 * ガントチャート画面の最上位コンポーネント。`page.tsx` に 1 つだけ置く。
 * 状態の判定や描画用の値の組み立ては `useGanttChart` が受け持つ。
 *
 * 左のリストと右のタイムラインは「1 つのスクロール領域」の中に左右に並べる。
 * 縦横のスクロール位置が自然にそろい、JavaScript での同期が要らない。
 * - 日付ヘッダー（右上）は `position: sticky; top: 0`
 * - 左のリストは `position: sticky; left: 0`
 * - 左上の角は両方向に固定する
 */
export function GanttChart() {
  const chart = useGanttChart()

  if (chart.status === "error") {
    return (
      <div className={styles.message} role="alert">
        <p>データを読み込めませんでした。{chart.loadErrorMessage}</p>
        <button type="button" onClick={chart.retryLoad}>
          再読み込み
        </button>
      </div>
    )
  }

  if (chart.status === "loading") {
    return <p className={styles.message}>読み込み中…</p>
  }

  // scrollArea（ref を持つ）を先に分割代入する。lint の react-hooks/refs が、
  // ref を渡す関数を持つ戻り値の全体を「ref を含む」と誤検知するのを避けるため
  const { attachScroller, handleScroll } = chart.scrollArea
  const { emptyState, sidePanel, memberDialog, barDrag, projectReorder } = chart

  return (
    <div className={styles.root}>
      <GanttHeader
        visibleDate={chart.header.visibleDate}
        onScrollBackward={chart.header.scrollBackward}
        onScrollForward={chart.header.scrollForward}
        onScrollToToday={chart.header.scrollToToday}
      />

      {chart.isEmpty ? (
        <div className={styles.empty}>
          <p>まず担当者を追加してください</p>
          <button type="button" onClick={chart.manageMembers}>
            担当者を管理
          </button>
          {emptyState.canSeedSampleData && (
            <button
              type="button"
              disabled={emptyState.isSeeding}
              onClick={emptyState.seedSampleData}
            >
              サンプルデータを入れる（開発用）
            </button>
          )}
          {emptyState.seedErrorMessage && (
            <p role="alert">
              サンプルデータを入れられませんでした。
              {emptyState.seedErrorMessage}
            </p>
          )}
        </div>
      ) : (
        <div
          ref={attachScroller}
          className={styles.scroller}
          onScroll={handleScroll}
        >
          <div className={styles.grid} style={chart.gridStyle}>
            <div className={styles.corner} style={chart.cornerStyle} />
            <TimelineDateHeader columns={chart.columns} today={chart.today} />
            <MemberList
              memberGroups={chart.memberGroups}
              collapsedMemberIds={chart.collapsedMemberIds}
              onToggleMember={chart.toggleMember}
              onAddProject={chart.addProject}
              onSelectProject={sidePanel.selectProject}
              onReorderProjects={projectReorder.reorder}
              onManageMembers={chart.manageMembers}
            />
            <Timeline
              memberGroups={chart.memberGroups}
              collapsedMemberIds={chart.collapsedMemberIds}
              columns={chart.columns}
              rangeStart={chart.rangeStart}
              rangeDays={chart.rangeDays}
              today={chart.today}
              editingProjectId={sidePanel.editingProjectId}
              onSelectProject={sidePanel.selectProject}
              onChangeProjectPeriod={barDrag.changePeriod}
            />
          </div>
        </div>
      )}

      <div className={styles.notices}>
        {barDrag.errorMessage && (
          <div className={styles.notice} role="alert">
            <p>期間を保存できませんでした。{barDrag.errorMessage}</p>
            <button type="button" onClick={barDrag.dismissError}>
              閉じる
            </button>
          </div>
        )}
        {projectReorder.errorMessage && (
          <div className={styles.notice} role="alert">
            <p>並び順を保存できませんでした。{projectReorder.errorMessage}</p>
            <button type="button" onClick={projectReorder.dismissError}>
              閉じる
            </button>
          </div>
        )}
      </div>

      {memberDialog.isOpen && (
        <MemberManageDialog
          memberGroups={chart.memberGroups}
          onCreate={memberDialog.create}
          onRename={memberDialog.rename}
          onMove={memberDialog.move}
          onDelete={memberDialog.remove}
          onClose={memberDialog.close}
        />
      )}

      {sidePanel.isVisible && (
        <ProjectSidePanel
          key={sidePanel.panelKey}
          members={sidePanel.members}
          project={sidePanel.project}
          defaultMemberId={sidePanel.defaultMemberId}
          today={chart.today}
          onSubmit={sidePanel.save}
          onDelete={sidePanel.remove}
          onClose={sidePanel.close}
        />
      )}
    </div>
  )
}
