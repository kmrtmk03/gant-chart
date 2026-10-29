import { memo } from "react"

import {
  DAY_COLUMN_WIDTH,
  MEMBER_ROW_HEIGHT,
  PROJECT_ROW_HEIGHT,
} from "../gantt.constants"
import type { TDateString } from "../gantt.type"
import type { IDayColumn, IMemberGroup } from "../gantt.utils"
import { MemberSummaryBar } from "./MemberSummaryBar"
import { ProjectBar } from "./ProjectBar"
import styles from "./Timeline.module.scss"
import { TimelineGrid } from "./TimelineGrid"
import { TodayLine } from "./TodayLine"

interface ITimelineProps {
  memberGroups: IMemberGroup[]
  /** 折りたたみ中の担当者 ID */
  collapsedMemberIds: ReadonlySet<string>
  columns: IDayColumn[]
  rangeStart: TDateString
  rangeDays: number
  today: TDateString
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
}: ITimelineProps) {
  return (
    <div
      className={styles.body}
      style={{ width: rangeDays * DAY_COLUMN_WIDTH }}
    >
      <TimelineGrid columns={columns} />
      <TodayLine rangeStart={rangeStart} rangeDays={rangeDays} today={today} />
      {memberGroups.map(({ member, projects }) => (
        <div key={member.id}>
          <div
            className={styles.memberRow}
            style={{ height: MEMBER_ROW_HEIGHT }}
          >
            <MemberSummaryBar
              projects={projects}
              rangeStart={rangeStart}
              rangeDays={rangeDays}
            />
          </div>
          {!collapsedMemberIds.has(member.id) && (
            <>
              {projects.map((project) => (
                <div
                  key={project.id}
                  className={styles.projectRow}
                  style={{ height: PROJECT_ROW_HEIGHT }}
                >
                  <ProjectBar
                    project={project}
                    rangeStart={rangeStart}
                    rangeDays={rangeDays}
                  />
                </div>
              ))}
              {/* 左リストの「案件を追加」行と高さをそろえるための空行 */}
              <div
                className={styles.projectRow}
                style={{ height: PROJECT_ROW_HEIGHT }}
              />
            </>
          )}
        </div>
      ))}
    </div>
  )
})
