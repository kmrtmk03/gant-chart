import type { PointerEvent as ReactPointerEvent } from "react"

import type { IProject } from "../../gantt.type"
import type { IDragReorderRowState } from "../../hooks/useDragReorder"
import { DragHandle } from "../DragHandle"
import styles from "./MemberListProjectRow.module.scss"
import { useMemberListProjectRow } from "./useMemberListProjectRow"

interface IMemberListProjectRowProps {
  project: IProject
  /** この行のドラッグの状態（浮かせる量・挿入位置の線） */
  dragState: IDragReorderRowState
  /** 行の要素を並び替えのフックに登録する（null で登録を外す） */
  registerRow: (projectId: string, element: HTMLElement | null) => void
  /** つかみの pointerdown。行の案件 ID とイベントを渡す */
  onHandlePointerDown: (
    projectId: string,
    event: ReactPointerEvent<Element>,
  ) => void
  onHandleLostPointerCapture: () => void
  /** 案件名をクリックしたとき。編集する案件の ID を渡す */
  onSelectProject: (projectId: string) => void
}

/**
 * 左のリストの案件 1 行。左端に並び替えのつかみ、その右に色の丸と案件名（クリックで編集用のパネルを開く）を並べる。
 * 行の見た目（高さ・ドラッグ中の追従・挿入位置の線）と、並び替えのフックへの登録は `useMemberListProjectRow` が受け持つ。
 */
export function MemberListProjectRow({
  project,
  dragState,
  registerRow,
  onHandlePointerDown,
  onHandleLostPointerCapture,
  onSelectProject,
}: IMemberListProjectRowProps) {
  // 戻り値は分割代入して使う。ref のコールバック（rowRef）を含むオブジェクトのプロパティ参照を、
  // lint の react-hooks/refs が「描画中の ref 参照」と誤検知するため（MemberManageRow と同じ対処）
  const { rowRef, rowClassName, rowStyle, colorDotStyle, handleLabel } =
    useMemberListProjectRow({ project, dragState, registerRow })

  return (
    <div ref={rowRef} className={rowClassName} style={rowStyle}>
      <DragHandle
        label={handleLabel}
        isDragging={dragState.isDragging}
        onPointerDown={(event) => onHandlePointerDown(project.id, event)}
        onLostPointerCapture={onHandleLostPointerCapture}
      />
      <button
        type="button"
        className={styles.projectButton}
        onClick={() => onSelectProject(project.id)}
      >
        <span className={styles.colorDot} style={colorDotStyle} />
        <span className={styles.name}>{project.name}</span>
      </button>
    </div>
  )
}
