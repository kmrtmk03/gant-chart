import type { IProject, TDateString } from "../../gantt.type"
import { useProjectBar } from "./useProjectBar"

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
 * 表示期間に入らない案件は何も描かない。位置や見た目の計算は `useProjectBar` が受け持つ。
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
  const { bar, handleClick } = useProjectBar({
    project,
    rangeStart,
    rangeDays,
    isEditing,
    onSelect,
  })
  if (bar === null) return null

  return (
    <button
      type="button"
      className={bar.className}
      style={bar.style}
      title={bar.title}
      onClick={handleClick}
    >
      {bar.label}
    </button>
  )
}
