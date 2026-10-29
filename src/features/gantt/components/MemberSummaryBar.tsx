import { BAR_COLORS } from "../gantt.constants"
import type { IProject, TDateString } from "../gantt.type"
import { getBarLayout } from "../gantt.utils"
import styles from "./MemberSummaryBar.module.scss"

interface IMemberSummaryBarProps {
  projects: IProject[]
  rangeStart: TDateString
  rangeDays: number
}

/**
 * 担当者行に出す、配下の案件をまとめた細い帯。折りたたみ中でも予定の入っている日が分かる。
 * 案件ごとに 1 本ずつ重ねて描くので、重なった日は濃く見える。
 */
export function MemberSummaryBar({
  projects,
  rangeStart,
  rangeDays,
}: IMemberSummaryBarProps) {
  return (
    <>
      {projects.map((project) => {
        const layout = getBarLayout(project, rangeStart, rangeDays)
        if (layout === null) return null
        return (
          <div
            key={project.id}
            className={styles.bar}
            style={{
              left: layout.left,
              width: layout.width,
              background: `var(${BAR_COLORS[project.color].cssVariable})`,
            }}
            aria-hidden
          />
        )
      })}
    </>
  )
}
