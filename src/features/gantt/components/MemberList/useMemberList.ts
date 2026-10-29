import type { CSSProperties } from "react"

import {
  BAR_COLORS,
  MEMBER_ROW_HEIGHT,
  PROJECT_ROW_HEIGHT,
} from "../../gantt.constants"
import type { IMemberGroup } from "../../gantt.utils"

interface IUseMemberListParams {
  memberGroups: IMemberGroup[]
  /** 折りたたみ中の担当者 ID */
  collapsedMemberIds: ReadonlySet<string>
}

/** 案件の行 1 つぶんの表示用の値 */
interface IMemberListProjectView {
  id: string
  name: string
  /** 色の丸に付ける背景色。値が動的なのでインラインスタイルで渡す */
  colorDotStyle: CSSProperties
}

/** 担当者ごとの行のまとまりの表示用の値 */
interface IMemberListRowView {
  memberId: string
  name: string
  /** 案件数の表示（例: "3件"） */
  countLabel: string
  /** 開いているか。false の間は案件の行と「案件を追加」を出さない */
  isExpanded: boolean
  toggleIcon: string
  toggleAriaLabel: string
  projects: IMemberListProjectView[]
}

/**
 * `MemberList` 専用のフック。担当者ごとの行（開閉の状態・ラベル・案件の色）を求める。
 * 行の高さは `Timeline` と同じ定数を使い、左右の行をそろえる。
 */
export function useMemberList({
  memberGroups,
  collapsedMemberIds,
}: IUseMemberListParams) {
  const memberRows: IMemberListRowView[] = memberGroups.map(
    ({ member, projects }) => {
      const isExpanded = !collapsedMemberIds.has(member.id)
      return {
        memberId: member.id,
        name: member.name,
        countLabel: `${projects.length}件`,
        isExpanded,
        toggleIcon: isExpanded ? "▼" : "▶",
        toggleAriaLabel: `${member.name}を${isExpanded ? "折りたたむ" : "開く"}`,
        projects: projects.map((project) => ({
          id: project.id,
          name: project.name,
          colorDotStyle: {
            background: `var(${BAR_COLORS[project.color].cssVariable})`,
          },
        })),
      }
    },
  )

  return {
    // 行の高さ
    memberRowHeight: MEMBER_ROW_HEIGHT,
    projectRowHeight: PROJECT_ROW_HEIGHT,
    // 担当者ごとの行
    memberRows,
  }
}
