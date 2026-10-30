import { memo } from "react"

import type { IMemberGroup } from "../../gantt.utils"
import { DragHandle } from "../DragHandle"
import styles from "./MemberListGroup.module.scss"
import { useMemberListGroup } from "./useMemberListGroup"

interface IMemberListGroupProps {
  memberGroup: IMemberGroup
  /** 開いているか。false の間は案件の行と「案件を追加」を出さない */
  isExpanded: boolean
  onToggleMember: (memberId: string) => void
  /** 「案件を追加」を押したとき。追加先の担当者 ID を渡す */
  onAddProject: (memberId: string) => void
  /** 案件名をクリックしたとき。編集する案件の ID を渡す */
  onSelectProject: (projectId: string) => void
  /** 案件をドラッグで並べ替えたとき。例外を投げない関数を渡すこと（失敗の表示は呼び出し側） */
  onReorderProjects: (memberId: string, orderedIds: string[]) => Promise<void>
}

/**
 * 左のリストの担当者 1 人ぶん（担当者行・案件の行・「案件を追加」）。
 * 案件の行の左端のつかみをドラッグすると、この担当者の中で案件を並べ替えられる。
 * 案件名のクリックは、これまでどおり編集用のサイドパネルを開く。
 * 表示用の値と並び替えの処理は `useMemberListGroup` が受け持つ。
 * MEMO: React.memo を保つため、関数の props は参照が変わらないものを渡すこと
 */
export const MemberListGroup = memo(function MemberListGroup({
  memberGroup,
  isExpanded,
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
    memberRowHeight,
    projectRowHeight,
    projectRows,
    isReorderDisabled,
    registerRow,
    handleHandlePointerDown,
    handleLostPointerCapture,
  } = useMemberListGroup({ memberGroup, isExpanded, onReorderProjects })

  return (
    <div>
      <div className={styles.memberRow} style={{ height: memberRowHeight }}>
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
      {isExpanded && (
        <>
          {/* 案件の行だけを 1 つの要素にまとめる（並び替えのスクロールのずれは、この要素の位置で求める） */}
          <div>
            {projectRows.map((project) => (
              <div
                key={project.id}
                ref={(element) => registerRow(project.id, element)}
                className={project.rowClassName}
                style={project.rowStyle}
              >
                <DragHandle
                  label={project.handleLabel}
                  isDragging={project.isDragging}
                  isDisabled={isReorderDisabled}
                  onPointerDown={(event) =>
                    handleHandlePointerDown(project.id, event)
                  }
                  onLostPointerCapture={handleLostPointerCapture}
                />
                <button
                  type="button"
                  className={styles.projectButton}
                  onClick={() => onSelectProject(project.id)}
                >
                  <span
                    className={styles.colorDot}
                    style={project.colorDotStyle}
                  />
                  <span className={styles.name}>{project.name}</span>
                </button>
              </div>
            ))}
          </div>
          <div
            className={styles.addProjectRow}
            style={{ height: projectRowHeight }}
          >
            <button
              type="button"
              className={styles.addProjectButton}
              onClick={() => onAddProject(memberId)}
            >
              ＋ 案件を追加
            </button>
          </div>
        </>
      )}
    </div>
  )
})
