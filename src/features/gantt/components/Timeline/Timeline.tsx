import { memo } from "react"

import type { TDateString } from "../../gantt.type"
import type { IDayColumn } from "../../utils/date.utils"
import type { TProjectPeriod } from "../../utils/layout.utils"
import type { IMemberRowGroup } from "../../ganttRows.utils"
import { MemberSummaryBar } from "../MemberSummaryBar"
import { ProjectBar } from "../ProjectBar"
import { TimelineGrid } from "../TimelineGrid"
import { TodayLine } from "../TodayLine"
import styles from "./Timeline.module.scss"
import { useTimeline } from "./useTimeline"

interface ITimelineProps {
  /** 担当者ごとの行のまとまり（開閉と行の並びは `MemberList` と同じものを受け取る） */
  rowGroups: IMemberRowGroup[]
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
 * 行の種別・順序・開閉・高さは `MemberList` と同じ行モデル（`ganttRows.utils.ts`）に従い、種別ごとに描くだけにして左右をそろえる。
 * 日付ヘッダーは `TimelineDateHeader` が別に受け持つ。
 */
export const Timeline = memo(function Timeline({
  rowGroups,
  columns,
  rangeStart,
  rangeDays,
  today,
  editingProjectId,
  onSelectProject,
  onChangeProjectPeriod,
}: ITimelineProps) {
  const { bodyWidth, getRowProps, isEditingProject } = useTimeline({
    rangeDays,
    editingProjectId,
  })

  return (
    <div className={styles.body} style={{ width: bodyWidth }}>
      <TimelineGrid columns={columns} />
      <TodayLine rangeStart={rangeStart} rangeDays={rangeDays} today={today} />
      {rowGroups.map(({ memberId, memberGroup, rows }) => (
        <div key={memberId}>
          {rows.map((row) => {
            switch (row.kind) {
              case "member":
                return (
                  <div key={row.key} {...getRowProps(row.kind)}>
                    <MemberSummaryBar
                      projects={memberGroup.projects}
                      rangeStart={rangeStart}
                      rangeDays={rangeDays}
                    />
                  </div>
                )
              case "project":
                return (
                  <div key={row.key} {...getRowProps(row.kind)}>
                    <ProjectBar
                      project={row.project}
                      rangeStart={rangeStart}
                      rangeDays={rangeDays}
                      isEditing={isEditingProject(row.project.id)}
                      onSelect={onSelectProject}
                      onChangePeriod={onChangeProjectPeriod}
                    />
                  </div>
                )
              case "addProject":
                // 左リストの「案件を追加」行と高さをそろえるための空行
                return <div key={row.key} {...getRowProps(row.kind)} />
            }
          })}
        </div>
      ))}
    </div>
  )
})
