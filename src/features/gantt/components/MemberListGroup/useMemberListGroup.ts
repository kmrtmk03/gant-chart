import { useCallback, useMemo } from "react"
import type { CSSProperties } from "react"

import {
  BAR_COLORS,
  MEMBER_ROW_HEIGHT,
  PROJECT_ROW_HEIGHT,
} from "../../gantt.constants"
import type { IMemberGroup } from "../../gantt.utils"
import { useDragReorder } from "../../hooks/useDragReorder"
import styles from "./MemberListGroup.module.scss"

interface IUseMemberListGroupParams {
  memberGroup: IMemberGroup
  /** 開いているか。false の間は案件の行と「案件を追加」を出さない */
  isExpanded: boolean
  /** 並べ替え後の案件の id の並びを保存する（例外を投げない契約） */
  onReorderProjects: (memberId: string, orderedIds: string[]) => Promise<void>
}

/** 案件の行 1 つぶんの表示用の値 */
interface IMemberListGroupProjectView {
  id: string
  name: string
  rowClassName: string
  /** 行の高さと、ドラッグ中の追従（transform）。値が動的なのでインラインスタイルで渡す */
  rowStyle: CSSProperties
  /** 色の丸に付ける背景色。値が動的なのでインラインスタイルで渡す */
  colorDotStyle: CSSProperties
  /** つかみの読み上げ用のラベル */
  handleLabel: string
  /** この行をドラッグしているか（つかみのカーソルに使う） */
  isDragging: boolean
}

/**
 * `MemberListGroup` 専用のフック。担当者 1 人ぶんの行（担当者行・案件の行）の表示用の値と、
 * 案件のドラッグによる並び替え（`useDragReorder`）をまとめる。
 * 並べ替えられる範囲はこの担当者の案件だけ（範囲の外へ出ても、先頭・末尾で止まる）。
 * 右のタイムラインは、離して保存するまで並びを変えない（`memberGroups` が変わったときに並び直る）。
 */
export function useMemberListGroup({
  memberGroup,
  isExpanded,
  onReorderProjects,
}: IUseMemberListGroupParams) {
  const { member, projects } = memberGroup

  // useDragReorder の effect やハンドラーが描画のたびに作り直されないよう、案件が変わったときだけ作る
  const projectIds = useMemo(
    () => projects.map((project) => project.id),
    [projects],
  )

  const handleReorder = useCallback(
    (orderedIds: string[]) => onReorderProjects(member.id, orderedIds),
    [member.id, onReorderProjects],
  )

  const {
    displayIds,
    isSaving,
    getRowState,
    registerRow,
    handleHandlePointerDown,
    handleLostPointerCapture,
  } = useDragReorder({
    ids: projectIds,
    onReorder: handleReorder,
    isDisabled: false,
  })

  // 行は displayIds の順（保存中は並べ替え後の順）に並べる
  const projectById = new Map(projects.map((project) => [project.id, project]))
  const projectRows: IMemberListGroupProjectView[] = displayIds.flatMap(
    (id) => {
      const project = projectById.get(id)
      if (project === undefined) return []
      const rowState = getRowState(id)
      return [
        {
          id,
          name: project.name,
          rowClassName: [
            styles.projectRow,
            rowState.isDragging && styles.dragging,
            rowState.dropIndicator === "before" && styles.dropBefore,
            rowState.dropIndicator === "after" && styles.dropAfter,
          ]
            .filter(Boolean)
            .join(" "),
          rowStyle: {
            height: PROJECT_ROW_HEIGHT,
            transform: rowState.isDragging
              ? `translateY(${rowState.offsetY}px)`
              : undefined,
          },
          colorDotStyle: {
            background: `var(${BAR_COLORS[project.color].cssVariable})`,
          },
          handleLabel: `${project.name} の並び順を変更`,
          isDragging: rowState.isDragging,
        },
      ]
    },
  )

  return {
    // 担当者行
    memberId: member.id,
    name: member.name,
    /** 案件数の表示（例: "3件"） */
    countLabel: `${projects.length}件`,
    toggleIcon: isExpanded ? "▼" : "▶",
    toggleAriaLabel: `${member.name}を${isExpanded ? "折りたたむ" : "開く"}`,
    // 行の高さ（`Timeline` と同じ定数を使い、左右の行をそろえる）
    memberRowHeight: MEMBER_ROW_HEIGHT,
    projectRowHeight: PROJECT_ROW_HEIGHT,
    // 案件の行
    projectRows,
    // 案件の並び替え（行の要素の登録と、つかみに渡すハンドラー）
    isReorderDisabled: isSaving,
    registerRow,
    handleHandlePointerDown,
    handleLostPointerCapture,
  }
}
