import {
  DAY_COLUMN_WIDTH,
  MEMBER_ROW_HEIGHT,
  PROJECT_ROW_HEIGHT,
} from "../../gantt.constants"
import type { IProject } from "../../gantt.type"
import type { IMemberGroup } from "../../gantt.utils"

interface IUseTimelineParams {
  memberGroups: IMemberGroup[]
  /** 折りたたみ中の担当者 ID */
  collapsedMemberIds: ReadonlySet<string>
  rangeDays: number
  /** サイドパネルで編集中の案件 ID（なければ null） */
  editingProjectId: string | null
}

/** 案件の帯 1 本ぶんの表示用の値 */
interface ITimelineProjectView {
  project: IProject
  /** サイドパネルで編集中か */
  isEditing: boolean
}

/** 担当者ごとの行のまとまりの表示用の値 */
interface ITimelineMemberRowView {
  memberId: string
  /** 担当者行のまとめ帯に使う、この担当者の案件（表示順）。折りたたみ中でも使う */
  projects: IProject[]
  /** 担当者行の配下（案件の行と「案件を追加」行の空行）を出すか。折りたたみ中は false */
  isExpanded: boolean
  /** 案件行に出す帯 */
  projectViews: ITimelineProjectView[]
}

/**
 * `Timeline` 専用のフック。本体の幅と、担当者ごとの行の表示用の値を求める。
 * 行の並びと高さは `MemberList` と同じにして左右をそろえること（高さは `gantt.constants.ts` の定数）。
 * 特に担当者が開いているか（`isExpanded`）の判定は `useMemberList` と同じにすること。
 * どちらかだけ直すと左右の行がずれるので、変更するときは両方のフックを見ること。
 */
export function useTimeline({
  memberGroups,
  collapsedMemberIds,
  rangeDays,
  editingProjectId,
}: IUseTimelineParams) {
  const memberRows: ITimelineMemberRowView[] = memberGroups.map(
    ({ member, projects }) => ({
      memberId: member.id,
      projects,
      isExpanded: !collapsedMemberIds.has(member.id),
      projectViews: projects.map((project) => ({
        project,
        isEditing: project.id === editingProjectId,
      })),
    }),
  )

  return {
    // 本体の大きさ
    bodyWidth: rangeDays * DAY_COLUMN_WIDTH,
    memberRowHeight: MEMBER_ROW_HEIGHT,
    projectRowHeight: PROJECT_ROW_HEIGHT,
    // 担当者ごとの行
    memberRows,
  }
}
