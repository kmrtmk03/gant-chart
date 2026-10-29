import { BAR_COLORS } from "../gantt.constants"
import type { IProject, TDateString } from "../gantt.type"
import { getBarLayout } from "../gantt.utils"
import styles from "./ProjectBar.module.scss"

interface IProjectBarProps {
  project: IProject
  rangeStart: TDateString
  rangeDays: number
  /** サイドパネルで編集中か。true の間は枠で強調する */
  isEditing: boolean
  /** 帯をクリックしたとき。編集する案件の ID を渡す */
  onSelect: (projectId: string) => void
}

/**
 * 案件の帯。案件名を中に出し、入りきらない分は省略記号にする。
 * 表示期間からはみ出している側は角を丸めない。表示期間に入らない案件は何も描かない。
 * クリックすると `onSelect` でサイドパネルを開く（キーボードでも操作できるよう button にしている）。
 * TODO: フェーズ 8 でドラッグを足す。
 */
export function ProjectBar({
  project,
  rangeStart,
  rangeDays,
  isEditing,
  onSelect,
}: IProjectBarProps) {
  const layout = getBarLayout(project, rangeStart, rangeDays)
  if (layout === null) return null

  const classNames = [styles.bar]
  if (layout.isClippedStart) classNames.push(styles.clippedStart)
  if (layout.isClippedEnd) classNames.push(styles.clippedEnd)
  if (isEditing) classNames.push(styles.editing)

  return (
    <button
      type="button"
      className={classNames.join(" ")}
      style={{
        left: layout.left,
        width: layout.width,
        background: `var(${BAR_COLORS[project.color].cssVariable})`,
      }}
      title={`${project.name}（${project.startDate} 〜 ${project.endDate}）`}
      onClick={() => onSelect(project.id)}
    >
      {project.name}
    </button>
  )
}
