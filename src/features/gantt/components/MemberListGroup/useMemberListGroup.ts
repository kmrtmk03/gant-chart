import { useCallback, useMemo } from "react"
import type { CSSProperties } from "react"

import { applyProjectOrder, getRowHeight } from "../../ganttRows.utils"
import type {
  IAddProjectRow,
  IMemberRow,
  IMemberRowGroup,
  IProjectRow,
} from "../../ganttRows.utils"
import { useDragReorder } from "../../hooks/useDragReorder"
import type { IDragReorderRowState } from "../../hooks/useDragReorder"

interface IUseMemberListGroupParams {
  /** 担当者 1 人ぶんの行のまとまり（開閉と行の並びは `Timeline` と同じものを受け取る） */
  rowGroup: IMemberRowGroup
  /**
   * 並べ替え後の案件の id の並びを保存する（例外を投げない契約）。
   * `orderedIds` はこのまとまりに見えている案件だけの並び、`movedId` は動かした案件
   */
  onReorderProjects: (
    memberId: string,
    orderedIds: string[],
    movedId: string,
  ) => Promise<void>
}

/** 左リストの案件行（行モデルの案件行に、ドラッグの状態を足したもの） */
export interface IMemberListProjectRowView extends IProjectRow {
  dragState: IDragReorderRowState
}

/** 左リストで描く 1 行ぶんの表示用の値。`kind` で判別する */
export type TMemberListRowView =
  IMemberRow | IMemberListProjectRowView | IAddProjectRow

/**
 * `MemberListGroup` 専用のフック。担当者 1 人ぶんの行（担当者行・案件の行・「案件を追加」）の表示用の値と、
 * 案件のドラッグによる並び替え（`useDragReorder`）をまとめる。
 * 行の種別・順序・開閉・高さは `ganttRows.utils.ts` の行モデルに従い、ここでは独自に決めない。
 * 並べられる範囲はこの担当者の案件だけ（範囲の外へ出ても、先頭・末尾で止まる）。
 * 右のタイムラインは、離して保存するまで並びを変えない（行モデルが変わったときに並び直る）。
 * 完了済みを隠しているときは、見えている案件だけを並べ替える（全体の並びに戻すのは呼び出し側）。
 */
export function useMemberListGroup({
  rowGroup,
  onReorderProjects,
}: IUseMemberListGroupParams) {
  const { memberId, memberGroup, isExpanded, rows } = rowGroup
  const { member, projects } = memberGroup

  // useDragReorder の effect やハンドラーが描画のたびに作り直されないよう、案件が変わったときだけ作る
  const projectIds = useMemo(
    () => projects.map((project) => project.id),
    [projects],
  )

  const handleReorder = useCallback(
    (orderedIds: string[], movedId: string) =>
      onReorderProjects(memberId, orderedIds, movedId),
    [memberId, onReorderProjects],
  )

  const {
    displayIds,
    getRowState,
    registerRow,
    handleHandlePointerDown,
    handleLostPointerCapture,
  } = useDragReorder({
    ids: projectIds,
    onReorder: handleReorder,
    isDisabled: false,
  })

  // 案件行だけを displayIds の順（保存中は並べ替え後の順）に差し替え、案件行にはドラッグの状態を付ける。
  // 担当者行・「案件を追加」行の位置は行モデルのまま。行の見た目は MemberListProjectRow が組み立てる
  const rowViews: TMemberListRowView[] = applyProjectOrder(
    rows,
    displayIds,
  ).map((row) =>
    row.kind === "project"
      ? { ...row, dragState: getRowState(row.project.id) }
      : row,
  )

  // 行の高さ（`Timeline` と同じ `getRowHeight` を使い、左右の行をそろえる）
  const memberRowStyle: CSSProperties = { height: getRowHeight("member") }
  const addProjectRowStyle: CSSProperties = {
    height: getRowHeight("addProject"),
  }

  return {
    // 担当者行
    memberId,
    name: member.name,
    /** 案件数の表示（例: "3件"） */
    countLabel: `${projects.length}件`,
    toggleIcon: isExpanded ? "▼" : "▶",
    toggleAriaLabel: `${member.name}を${isExpanded ? "折りたたむ" : "開く"}`,
    isExpanded,
    // 行（担当者行 → 案件行 → 「案件を追加」行の順。折りたたみ中は担当者行だけ）と、その高さ
    rowViews,
    memberRowStyle,
    addProjectRowStyle,
    // 案件の並び替え（行の要素の登録と、つかみに渡すハンドラー）
    registerRow,
    handleHandlePointerDown,
    handleLostPointerCapture,
  }
}
