import { useCallback } from "react"
import type { CSSProperties } from "react"

import { BAR_COLORS, PROJECT_ROW_HEIGHT } from "../../gantt.constants"
import type { IProject } from "../../gantt.type"
import type { IDragReorderRowState } from "../../hooks/useDragReorder"
import styles from "./MemberListProjectRow.module.scss"

interface IUseMemberListProjectRowParams {
  project: IProject
  /** この行のドラッグの状態（浮かせる量・挿入位置の線） */
  dragState: IDragReorderRowState
  /** 行の要素を並び替えのフックに登録する（null で登録を外す） */
  registerRow: (projectId: string, element: HTMLElement | null) => void
}

/**
 * `MemberListProjectRow` 専用のフック。行の見た目の値と、並び替えのフックへ要素を登録する ref を返す。
 * 行の高さは `Timeline` と同じ定数を使い、左右の行をそろえる。
 */
export function useMemberListProjectRow({
  project,
  dragState,
  registerRow,
}: IUseMemberListProjectRowParams) {
  /**
   * 行の要素を並び替えのフックに登録する。行の要素の ref に渡すこと。
   * 参照を保つので、再描画のたびに登録をやり直さない（React は ref の関数が変わると null → 要素で呼び直すため）
   */
  const rowRef = useCallback(
    (element: HTMLDivElement | null) => registerRow(project.id, element),
    [project.id, registerRow],
  )

  const rowClassName = [
    styles.row,
    dragState.isDragging && styles.dragging,
    dragState.dropIndicator === "before" && styles.dropBefore,
    dragState.dropIndicator === "after" && styles.dropAfter,
  ]
    .filter(Boolean)
    .join(" ")

  // 行の高さと、ドラッグ中の追従（transform）。値が動的なのでインラインスタイルで渡す
  const rowStyle: CSSProperties = {
    height: PROJECT_ROW_HEIGHT,
    transform: dragState.isDragging
      ? `translateY(${dragState.offsetY}px)`
      : undefined,
  }

  return {
    // 行
    rowRef,
    rowClassName,
    rowStyle,
    // 色の丸に付ける背景色。値が動的なのでインラインスタイルで渡す
    colorDotStyle: {
      background: `var(${BAR_COLORS[project.color].cssVariable})`,
    } satisfies CSSProperties,
    // つかみの読み上げ用のラベル
    handleLabel: `${project.name} の並び順を変更`,
  }
}
