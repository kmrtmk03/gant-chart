import type { CSSProperties } from "react"

import { BAR_COLORS } from "../../gantt.constants"
import type { IProject, TDateString } from "../../gantt.type"
import { getBarLayout } from "../../gantt.utils"
import styles from "./MemberSummaryBar.module.scss"

interface IUseMemberSummaryBarParams {
  projects: IProject[]
  rangeStart: TDateString
  rangeDays: number
}

/** 担当者行にまとめて描く細い帯 1 本ぶんの表示用の値 */
interface ISummaryBarView {
  key: string
  /** 完了済みの案件の帯は薄くする */
  className: string
  /** 位置・幅・色。値が動的なのでインラインスタイルで渡す */
  style: CSSProperties
}

/**
 * `MemberSummaryBar` 専用のフック。配下の案件ごとに帯の位置・幅・色を求める。
 * 表示期間に入らない案件は帯を作らない（`getBarLayout` が null を返す）。
 * 完了済みの案件（表示しているときだけ渡ってくる）は、帯を薄くする。
 */
export function useMemberSummaryBar({
  projects,
  rangeStart,
  rangeDays,
}: IUseMemberSummaryBarParams) {
  const bars: ISummaryBarView[] = []
  for (const project of projects) {
    const layout = getBarLayout(project, rangeStart, rangeDays)
    if (layout === null) continue
    bars.push({
      key: project.id,
      className: [styles.bar, project.completedAt !== null && styles.completed]
        .filter(Boolean)
        .join(" "),
      style: {
        left: layout.left,
        width: layout.width,
        background: `var(${BAR_COLORS[project.color].cssVariable})`,
      },
    })
  }

  return { bars }
}
