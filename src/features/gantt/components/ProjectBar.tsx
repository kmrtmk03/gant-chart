import { BAR_COLORS } from "../gantt.constants"
import type { IProject, TDateString } from "../gantt.type"
import { getBarLayout } from "../gantt.utils"
import styles from "./ProjectBar.module.scss"

interface IProjectBarProps {
  project: IProject
  rangeStart: TDateString
  rangeDays: number
}

/**
 * 案件の帯。案件名を中に出し、入りきらない分は省略記号にする。
 * 表示期間からはみ出している側は角を丸めない。表示期間に入らない案件は何も描かない。
 * TODO: フェーズ 6 でクリックしてサイドパネルを開く、フェーズ 8 でドラッグを足す。
 */
export function ProjectBar({
  project,
  rangeStart,
  rangeDays,
}: IProjectBarProps) {
  const layout = getBarLayout(project, rangeStart, rangeDays)
  if (layout === null) return null

  const classNames = [styles.bar]
  if (layout.isClippedStart) classNames.push(styles.clippedStart)
  if (layout.isClippedEnd) classNames.push(styles.clippedEnd)

  return (
    <div
      className={classNames.join(" ")}
      style={{
        left: layout.left,
        width: layout.width,
        background: `var(${BAR_COLORS[project.color].cssVariable})`,
      }}
      title={`${project.name}（${project.startDate} 〜 ${project.endDate}）`}
    >
      {project.name}
    </div>
  )
}
