import { memo } from "react"

import type { IMemberGroup } from "../../gantt.utils"
import { MemberListGroup } from "../MemberListGroup"
import styles from "./MemberList.module.scss"
import { useMemberList } from "./useMemberList"

interface IMemberListProps {
  memberGroups: IMemberGroup[]
  /** 折りたたみ中の担当者 ID */
  collapsedMemberIds: ReadonlySet<string>
  onToggleMember: (memberId: string) => void
  /** 担当者の案件リスト下の「案件を追加」を押したとき。追加先の担当者 ID を渡す */
  onAddProject: (memberId: string) => void
  /** 案件名をクリックしたとき。編集する案件の ID を渡す（React.memo を保つため、参照が変わらない関数を渡すこと） */
  onSelectProject: (projectId: string) => void
  /**
   * 案件をドラッグで並べ替えたとき。担当者 ID と、並べ替え後のその担当者の（見えている）案件の id、動かした案件の id を渡す。
   * 例外を投げない関数を渡すこと（失敗の表示は呼び出し側）。React.memo を保つため、参照が変わらない関数を渡すこと
   */
  onReorderProjects: (
    memberId: string,
    orderedIds: string[],
    movedId: string,
  ) => Promise<void>
  onManageMembers: () => void
}

/**
 * 左のリスト。担当者（親）→ 案件（子）の 2 階層で並べる。
 * 行の高さは `Timeline` と同じ定数を使い、左右の行をそろえる。
 * 担当者 1 人ぶん（担当者行・案件の行・「案件を追加」）は `MemberListGroup` が描き、
 * 最下部に「担当者を管理」ボタンを置く。
 * 案件名をクリックすると、帯のクリックと同じく編集用のサイドパネルを開く。
 * 案件の左端のつかみをドラッグすると、同じ担当者の中で並べ替えられる。
 */
export const MemberList = memo(function MemberList({
  memberGroups,
  collapsedMemberIds,
  onToggleMember,
  onAddProject,
  onSelectProject,
  onReorderProjects,
  onManageMembers,
}: IMemberListProps) {
  const { groups } = useMemberList({ memberGroups, collapsedMemberIds })

  return (
    <div className={styles.list}>
      {groups.map((group) => (
        <MemberListGroup
          key={group.memberId}
          memberGroup={group.memberGroup}
          isExpanded={group.isExpanded}
          onToggleMember={onToggleMember}
          onAddProject={onAddProject}
          onSelectProject={onSelectProject}
          onReorderProjects={onReorderProjects}
        />
      ))}
      <div className={styles.footer}>
        <button type="button" onClick={onManageMembers}>
          担当者を管理
        </button>
      </div>
    </div>
  )
})
