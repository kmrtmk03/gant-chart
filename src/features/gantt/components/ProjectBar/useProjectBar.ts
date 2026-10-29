import { useCallback } from "react"
import type { CSSProperties } from "react"

import { BAR_COLORS } from "../../gantt.constants"
import type { IProject, TDateString } from "../../gantt.type"
import { getBarLayout } from "../../gantt.utils"
import styles from "./ProjectBar.module.scss"

interface IUseProjectBarParams {
  project: IProject
  rangeStart: TDateString
  rangeDays: number
  /** サイドパネルで編集中か */
  isEditing: boolean
  /** 帯をクリックしたとき。編集する案件の ID を渡す */
  onSelect: (projectId: string) => void
}

/**
 * `ProjectBar` 専用のフック。帯の位置・幅・色・クラス名・ツールチップを求める。
 * 表示期間に入らない案件は `bar` が null になる（呼び出し側は何も描かないこと）。
 * クラス名はこのコンポーネントの CSS Modules から組み立てて返す。
 */
export function useProjectBar({
  project,
  rangeStart,
  rangeDays,
  isEditing,
  onSelect,
}: IUseProjectBarParams) {
  const handleClick = useCallback(() => {
    onSelect(project.id)
  }, [onSelect, project.id])

  const layout = getBarLayout(project, rangeStart, rangeDays)
  if (layout === null) return { bar: null, handleClick }

  // 表示期間からはみ出している側は角を丸めない。編集中は枠で強調する
  const classNames = [styles.bar]
  if (layout.isClippedStart) classNames.push(styles.clippedStart)
  if (layout.isClippedEnd) classNames.push(styles.clippedEnd)
  if (isEditing) classNames.push(styles.editing)

  // 位置・幅・色は動的な値なのでインラインスタイルで渡す
  const style: CSSProperties = {
    left: layout.left,
    width: layout.width,
    backgroundColor: `var(${BAR_COLORS[project.color].cssVariable})`,
  }

  return {
    bar: {
      className: classNames.join(" "),
      style,
      title: `${project.name}（${project.startDate} 〜 ${project.endDate}）`,
      label: project.name,
    },
    handleClick,
  }
}
