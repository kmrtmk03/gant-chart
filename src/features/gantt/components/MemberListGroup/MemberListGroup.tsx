import { memo } from "react"

import type { IMemberRowGroup } from "../../ganttRows.utils"
import { MemberListProjectRow } from "../MemberListProjectRow"
import styles from "./MemberListGroup.module.scss"
import { useMemberListGroup } from "./useMemberListGroup"

interface IMemberListGroupProps {
  /** 担当者 1 人ぶんの行のまとまり（開閉と行の並びは `Timeline` と同じものを受け取る） */
  rowGroup: IMemberRowGroup
  onToggleMember: (memberId: string) => void
  /** 「案件を追加」を押したとき。追加先の担当者 ID を渡す */
  onAddProject: (memberId: string) => void
  /** 案件名をクリックしたとき。編集する案件の ID を渡す */
  onSelectProject: (projectId: string) => void
  /** 案件をドラッグで並べ替えたとき。例外を投げない関数を渡すこと（失敗の表示は呼び出し側） */
  onReorderProjects: (
    memberId: string,
    orderedIds: string[],
    movedId: string,
  ) => Promise<void>
}

/**
 * 左のリストの担当者 1 人ぶん（担当者行・案件の行・「案件を追加」）。
 * 案件の行の左端のつかみをドラッグすると、この担当者の中で案件を並べ替えられる。
 * 案件名のクリックは、これまでどおり編集用のサイドパネルを開く。
 * 行の種別・順序・開閉・高さは行モデル（`ganttRows.utils.ts`）に従い、ここでは種別ごとに描くだけにする。
 * 表示用の値と並び替えの処理は `useMemberListGroup` が受け持つ。
 * MEMO: React.memo を保つため、関数の props は参照が変わらないものを渡すこと
 */
export const MemberListGroup = memo(function MemberListGroup({
  rowGroup,
  onToggleMember,
  onAddProject,
  onSelectProject,
  onReorderProjects,
}: IMemberListGroupProps) {
  // 戻り値は分割代入して使う。ref のコールバックに使う関数を含むオブジェクトのプロパティ参照を、
  // lint の react-hooks/refs が「描画中の ref 参照」と誤検知するため（GanttChart と同じ対処）
  const {
    memberId,
    name,
    countLabel,
    toggleIcon,
    toggleAriaLabel,
    isExpanded,
    rowViews,
    memberRowStyle,
    addProjectRowStyle,
    registerRow,
    handleHandlePointerDown,
    handleLostPointerCapture,
  } = useMemberListGroup({ rowGroup, onReorderProjects })

  return (
    <div>
      {rowViews.map((row) => {
        switch (row.kind) {
          case "member":
            return (
              <div
                key={row.key}
                className={styles.memberRow}
                style={memberRowStyle}
              >
                <button
                  type="button"
                  className={styles.toggle}
                  aria-expanded={isExpanded}
                  aria-label={toggleAriaLabel}
                  onClick={() => onToggleMember(memberId)}
                >
                  {toggleIcon}
                </button>
                <span className={styles.name}>{name}</span>
                <span className={styles.count}>{countLabel}</span>
              </div>
            )
          case "project":
            return (
              <MemberListProjectRow
                key={row.key}
                project={row.project}
                dragState={row.dragState}
                registerRow={registerRow}
                onHandlePointerDown={handleHandlePointerDown}
                onHandleLostPointerCapture={handleLostPointerCapture}
                onSelectProject={onSelectProject}
              />
            )
          case "addProject":
            return (
              <div
                key={row.key}
                className={styles.addProjectRow}
                style={addProjectRowStyle}
              >
                <button
                  type="button"
                  className={styles.addProjectButton}
                  onClick={() => onAddProject(memberId)}
                >
                  ＋ 案件を追加
                </button>
              </div>
            )
        }
      })}
    </div>
  )
})
