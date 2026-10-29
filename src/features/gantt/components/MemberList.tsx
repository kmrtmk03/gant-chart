import { memo } from "react"

import {
  BAR_COLORS,
  MEMBER_ROW_HEIGHT,
  PROJECT_ROW_HEIGHT,
} from "../gantt.constants"
import type { IMemberGroup } from "../gantt.utils"
import styles from "./MemberList.module.scss"

interface IMemberListProps {
  memberGroups: IMemberGroup[]
  /** 折りたたみ中の担当者 ID */
  collapsedMemberIds: ReadonlySet<string>
  onToggleMember: (memberId: string) => void
  /** 担当者の案件リスト下の「案件を追加」を押したとき。追加先の担当者 ID を渡す */
  onAddProject: (memberId: string) => void
  /** 案件名をクリックしたとき。編集する案件の ID を渡す（React.memo を保つため、参照が変わらない関数を渡すこと） */
  onSelectProject: (projectId: string) => void
  onManageMembers: () => void
}

/**
 * 左のリスト。担当者（親）→ 案件（子）の 2 階層で並べる。
 * 行の高さは `Timeline` と同じ定数を使い、左右の行をそろえる。
 * 各担当者の案件の下（開いているときだけ）に「案件を追加」、最下部に「担当者を管理」ボタンを置く。
 * 案件名をクリックすると、帯のクリックと同じく編集用のサイドパネルを開く。
 */
export const MemberList = memo(function MemberList({
  memberGroups,
  collapsedMemberIds,
  onToggleMember,
  onAddProject,
  onSelectProject,
  onManageMembers,
}: IMemberListProps) {
  return (
    <div className={styles.list}>
      {memberGroups.map(({ member, projects }) => {
        const isCollapsed = collapsedMemberIds.has(member.id)
        return (
          <div key={member.id}>
            <div
              className={styles.memberRow}
              style={{ height: MEMBER_ROW_HEIGHT }}
            >
              <button
                type="button"
                className={styles.toggle}
                aria-expanded={!isCollapsed}
                aria-label={`${member.name}を${isCollapsed ? "開く" : "折りたたむ"}`}
                onClick={() => onToggleMember(member.id)}
              >
                {isCollapsed ? "▶" : "▼"}
              </button>
              <span className={styles.name}>{member.name}</span>
              <span className={styles.count}>{projects.length}件</span>
            </div>
            {!isCollapsed && (
              <>
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className={styles.projectRow}
                    style={{ height: PROJECT_ROW_HEIGHT }}
                  >
                    <button
                      type="button"
                      className={styles.projectButton}
                      onClick={() => onSelectProject(project.id)}
                    >
                      <span
                        className={styles.colorDot}
                        style={{
                          background: `var(${BAR_COLORS[project.color].cssVariable})`,
                        }}
                      />
                      <span className={styles.name}>{project.name}</span>
                    </button>
                  </div>
                ))}
                <div
                  className={styles.addProjectRow}
                  style={{ height: PROJECT_ROW_HEIGHT }}
                >
                  <button
                    type="button"
                    className={styles.addProjectButton}
                    onClick={() => onAddProject(member.id)}
                  >
                    ＋ 案件を追加
                  </button>
                </div>
              </>
            )}
          </div>
        )
      })}
      <div className={styles.footer}>
        <button type="button" onClick={onManageMembers}>
          担当者を管理
        </button>
      </div>
    </div>
  )
})
