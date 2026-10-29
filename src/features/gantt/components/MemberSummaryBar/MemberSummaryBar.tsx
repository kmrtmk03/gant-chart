import type { IProject, TDateString } from "../../gantt.type"
import styles from "./MemberSummaryBar.module.scss"
import { useMemberSummaryBar } from "./useMemberSummaryBar"

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
  const { bars } = useMemberSummaryBar({ projects, rangeStart, rangeDays })

  return (
    <>
      {bars.map((bar) => (
        <div
          key={bar.key}
          className={styles.bar}
          style={bar.style}
          aria-hidden
        />
      ))}
    </>
  )
}
