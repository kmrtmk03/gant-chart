import type { IMemberGroup } from "../../gantt.utils"

interface IUseMemberListParams {
  memberGroups: IMemberGroup[]
  /** 折りたたみ中の担当者 ID */
  collapsedMemberIds: ReadonlySet<string>
}

/** 担当者 1 人ぶんのまとまりの表示用の値 */
interface IMemberListGroupView {
  memberId: string
  memberGroup: IMemberGroup
  /** 開いているか。false の間は案件の行と「案件を追加」を出さない */
  isExpanded: boolean
}

/**
 * `MemberList` 専用のフック。担当者ごとのまとまりと、開いているかどうかを求める。
 * 行ごとの表示用の値は、担当者 1 人ぶんのコンポーネント（`MemberListGroup`）のフックが求める。
 * 担当者が開いているか（`isExpanded`）の判定は `useTimeline` と同じにすること。
 * どちらかだけ直すと左右の行がずれるので、変更するときは両方のフックを見ること。
 */
export function useMemberList({
  memberGroups,
  collapsedMemberIds,
}: IUseMemberListParams) {
  const groups: IMemberListGroupView[] = memberGroups.map((memberGroup) => ({
    memberId: memberGroup.member.id,
    memberGroup,
    isExpanded: !collapsedMemberIds.has(memberGroup.member.id),
  }))

  return {
    // 担当者ごとのまとまり
    groups,
  }
}
