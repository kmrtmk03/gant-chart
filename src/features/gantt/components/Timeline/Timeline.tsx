import { memo } from "react"

import type { TDateString } from "../../gantt.type"
import type {
  IDayColumn,
  IMemberGroup,
  TProjectPeriod,
} from "../../gantt.utils"
import { MemberSummaryBar } from "../MemberSummaryBar"
import { ProjectBar } from "../ProjectBar"
import { TimelineGrid } from "../TimelineGrid"
import { TodayLine } from "../TodayLine"
import styles from "./Timeline.module.scss"
import { useTimeline } from "./useTimeline"

interface ITimelineProps {
  memberGroups: IMemberGroup[]
  /** 折りたたみ中の担当者 ID */
  collapsedMemberIds: ReadonlySet<string>
  columns: IDayColumn[]
  rangeStart: TDateString
  rangeDays: number
  today: TDateString
  /** サイドパネルで編集中の案件 ID（なければ null） */
  editingProjectId: string | null
  /** 帯をクリックしたとき。React.memo を効かせるため、参照が変わらない関数を渡すこと */
  onSelectProject: (projectId: string) => void
  /**
   * 帯のドラッグで期間を変えたとき。失敗の表示は呼び出し側が行い、例外は投げないこと。
   * React.memo を効かせるため、参照が変わらない関数を渡すこと
   */
  onChangeProjectPeriod: (
    projectId: string,
    period: TProjectPeriod,
  ) => Promise<void>
}

/**
 * 右側のタイムライン本体。背景の縦線・今日の線・帯を重ねて描く。
 * 行の並びと高さは `MemberList` と同じ（担当者行 → 開いていれば案件行と「案件を追加」行）にして、左右をそろえる。
 * 日付ヘッダーは `TimelineDateHeader` が別に受け持つ。
 */
export const Timeline = memo(function Timeline({
  memberGroups,
  collapsedMemberIds,
  columns,
  rangeStart,
  rangeDays,
  today,
  editingProjectId,
  onSelectProject,
  onChangeProjectPeriod,
}: ITimelineProps) {
  const { bodyWidth, memberRowHeight, projectRowHeight, memberRows } =
    useTimeline({
      memberGroups,
      collapsedMemberIds,
      rangeDays,
      editingProjectId,
    })

  return (
    <div className={styles.body} style={{ width: bodyWidth }}>
      <TimelineGrid columns={columns} />
      <TodayLine rangeStart={rangeStart} rangeDays={rangeDays} today={today} />
      {memberRows.map((memberRow) => (
        <div key={memberRow.memberId}>
          <div className={styles.memberRow} style={{ height: memberRowHeight }}>
            <MemberSummaryBar
              projects={memberRow.projects}
              rangeStart={rangeStart}
              rangeDays={rangeDays}
            />
          </div>
          {memberRow.isExpanded && (
            <>
              {memberRow.projectViews.map(({ project, isEditing }) => (
                <div
                  key={project.id}
                  className={styles.projectRow}
                  style={{ height: projectRowHeight }}
                >
                  <ProjectBar
                    project={project}
                    rangeStart={rangeStart}
                    rangeDays={rangeDays}
                    isEditing={isEditing}
                    onSelect={onSelectProject}
                    onChangePeriod={onChangeProjectPeriod}
                  />
                </div>
              ))}
              {/* 左リストの「案件を追加」行と高さをそろえるための空行 */}
              <div
                className={styles.projectRow}
                style={{ height: projectRowHeight }}
              />
            </>
          )}
        </div>
      ))}
    </div>
  )
})
