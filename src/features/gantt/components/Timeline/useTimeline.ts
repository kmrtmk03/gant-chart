import { useCallback } from "react"
import type { CSSProperties } from "react"

import { DAY_COLUMN_WIDTH } from "../../gantt.constants"
import { getRowHeight } from "../../ganttRows.utils"
import type { TGanttRowKind } from "../../ganttRows.utils"
import styles from "./Timeline.module.scss"

interface IUseTimelineParams {
  rangeDays: number
  /** サイドパネルで編集中の案件 ID（なければ null） */
  editingProjectId: string | null
}

/** 行の種別ごとの className。担当者行だけ別、案件行と「案件を追加」行の空行は同じ */
const ROW_CLASS_NAME: Record<TGanttRowKind, string | undefined> = {
  member: styles.memberRow,
  project: styles.projectRow,
  addProject: styles.projectRow,
}

/**
 * 行の種別から、行の className と高さを求める。
 * 高さは左リストと同じ `getRowHeight` を使い、左右の行をそろえる。
 * 描画の状態に依存しないので、モジュールの関数として参照を保つ（`useTimeline` が返す）。
 */
function getRowProps(kind: TGanttRowKind): {
  className: string | undefined
  style: CSSProperties
} {
  return {
    className: ROW_CLASS_NAME[kind],
    style: { height: getRowHeight(kind) },
  }
}

/**
 * `Timeline` 専用のフック。本体の幅と、行・帯の表示用の値を求める。
 * 行の種別・順序・開閉は `ganttRows.utils.ts` の行モデル（呼び出し側から受け取る `rowGroups`）に従い、
 * ここでは独自に決めない。左リスト（`MemberList`）と同じモデルを描くので、左右の行がずれない。
 */
export function useTimeline({
  rangeDays,
  editingProjectId,
}: IUseTimelineParams) {
  /** 案件がサイドパネルで編集中か（帯の強調に使う） */
  const isEditingProject = useCallback(
    (projectId: string) => projectId === editingProjectId,
    [editingProjectId],
  )

  return {
    // 本体の大きさ
    bodyWidth: rangeDays * DAY_COLUMN_WIDTH,
    // 行の見た目と、帯の強調
    getRowProps,
    isEditingProject,
  }
}
