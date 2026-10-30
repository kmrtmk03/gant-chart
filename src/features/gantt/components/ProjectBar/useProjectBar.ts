import { useCallback, useMemo } from "react"
import type { CSSProperties, MouseEvent } from "react"

import { BAR_COLORS } from "../../gantt.constants"
import type { IProject, TDateString } from "../../gantt.type"
import { getBarLayout, type TProjectPeriod } from "../../gantt.utils"
import { formatBarPeriodLabel } from "./barDrag.utils"
import styles from "./ProjectBar.module.scss"
import { useBarDrag } from "./useBarDrag"

interface IUseProjectBarParams {
  project: IProject
  rangeStart: TDateString
  rangeDays: number
  /** サイドパネルで編集中か */
  isEditing: boolean
  /** 帯をクリックしたとき。編集する案件の ID を渡す */
  onSelect: (projectId: string) => void
  /** ドラッグで期間を変えたとき。失敗の表示は呼び出し側が行い、例外は投げないこと */
  onChangePeriod: (projectId: string, period: TProjectPeriod) => Promise<void>
}

/**
 * `ProjectBar` 専用のフック。帯の位置・幅・色・クラス名・ツールチップと、ドラッグの操作（`useBarDrag`）をまとめる。
 * 表示期間に入らない案件は `bar` が null になる（呼び出し側は何も描かないこと）。
 * クラス名はこのコンポーネントの CSS Modules から組み立てて返す。
 */
export function useProjectBar({
  project,
  rangeStart,
  rangeDays,
  isEditing,
  onSelect,
  onChangePeriod,
}: IUseProjectBarParams) {
  const { id: projectId, startDate, endDate } = project

  const handleCommit = useCallback(
    (period: TProjectPeriod) => onChangePeriod(projectId, period),
    [onChangePeriod, projectId],
  )
  // useBarDrag の effect が描画のたびに登録し直さないよう、期間のオブジェクトの参照を保つ
  const period = useMemo(() => ({ startDate, endDate }), [startDate, endDate])
  // サイドパネルで編集中の案件はドラッグできない（クリックだけ受け付ける）
  const drag = useBarDrag({
    period,
    onCommit: handleCommit,
    isDisabled: isEditing,
  })
  const { consumeClickSuppression } = drag

  // ドラッグ・取り消しの直後の click ではパネルを開かない。キーボード（Enter / Space）の click はそのまま開く。
  // キーボード由来の click は detail（クリック回数）が 0 になるので、それでポインター由来と区別する
  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      if (consumeClickSuppression(event.detail > 0)) return
      onSelect(projectId)
    },
    [consumeClickSuppression, onSelect, projectId],
  )

  // 伸縮のつかみを出すかは、ドラッグ前の位置で決める（ドラッグ中につかみが消えたり出たりしないように）。
  // 表示期間の外にはみ出している側の端は、見えていないので伸縮させない。編集中はつかみ自体を出さない
  const originalLayout = isEditing
    ? null
    : getBarLayout(project, rangeStart, rangeDays)
  const layout = getBarLayout(drag.displayPeriod, rangeStart, rangeDays)

  // 帯（button）そのものに渡すハンドラー。帯を描かないときも同じ形で返す
  const handlers = {
    handleClick,
    handleMovePointerDown: drag.handleMovePointerDown,
    handleLostPointerCapture: drag.handleLostPointerCapture,
  }
  if (layout === null) return { bar: null, ...handlers }

  // 表示期間からはみ出している側は角を丸めない。編集中は枠で強調する
  const classNames = [styles.bar]
  if (layout.isClippedStart) classNames.push(styles.clippedStart)
  if (layout.isClippedEnd) classNames.push(styles.clippedEnd)
  if (isEditing) classNames.push(styles.editing)
  // 完了済み（表示しているとき）は薄くして、未完了と見分けられるようにする。クリック・ドラッグはそのままできる
  if (project.completedAt !== null) classNames.push(styles.completed)
  if (drag.isDragging) classNames.push(styles.dragging)
  if (drag.isSaving) classNames.push(styles.saving)

  // 位置・幅・色は動的な値なのでインラインスタイルで渡す。
  // 背景のグラデーションを消さないよう、色は background ではなく backgroundColor で渡す
  const style: CSSProperties = {
    left: layout.left,
    width: layout.width,
    backgroundColor: `var(${BAR_COLORS[project.color].cssVariable})`,
  }

  // ドラッグ中だけ、帯の上に変更後の期間を出す（帯と同じ左端にそろえる）
  const periodLabel = drag.isDragging
    ? {
        className: styles.periodLabel,
        text: formatBarPeriodLabel(drag.displayPeriod),
        style: { left: layout.left } satisfies CSSProperties,
      }
    : null

  return {
    bar: {
      className: classNames.join(" "),
      style,
      title: `${project.name}（${startDate} 〜 ${endDate}）${project.completedAt === null ? "" : "【完了済み】"}`,
      label: project.name,
      periodLabel,
      // 伸縮のつかみ。編集中・はみ出している側（または描けない）ときは null
      resizeStartHandle:
        originalLayout !== null && !originalLayout.isClippedStart
          ? {
              className: `${styles.handle} ${styles.handleStart}`,
              onPointerDown: drag.handleResizeStartPointerDown,
            }
          : null,
      resizeEndHandle:
        originalLayout !== null && !originalLayout.isClippedEnd
          ? {
              className: `${styles.handle} ${styles.handleEnd}`,
              onPointerDown: drag.handleResizeEndPointerDown,
            }
          : null,
    },
    ...handlers,
  }
}
