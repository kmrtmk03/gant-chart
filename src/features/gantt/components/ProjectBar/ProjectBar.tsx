import type { IProject, TDateString } from "../../gantt.type"
import type { TProjectPeriod } from "../../gantt.utils"
import { useProjectBar } from "./useProjectBar"

interface IProjectBarProps {
  project: IProject
  rangeStart: TDateString
  rangeDays: number
  /** サイドパネルで編集中か。true の間は枠で強調する */
  isEditing: boolean
  /** 帯をクリックしたとき。編集する案件の ID を渡す */
  onSelect: (projectId: string) => void
  /** ドラッグで期間を変えたとき。失敗の表示は呼び出し側が行い、例外は投げないこと */
  onChangePeriod: (projectId: string, period: TProjectPeriod) => Promise<void>
}

/**
 * 案件の帯。案件名を中に出し、入りきらない分は省略記号にする。
 * 表示期間に入らない案件は何も描かない。位置や見た目の計算・ドラッグの操作は `useProjectBar` が受け持つ。
 * - クリックすると `onSelect` でサイドパネルを開く（キーボードでも操作できるよう button にしている）
 * - 中央をドラッグすると移動、左右の端（つかみ）をドラッグすると伸縮し、離すと `onChangePeriod` で保存する。
 *   サイドパネルで編集中（`isEditing`）の帯はドラッグできない
 */
export function ProjectBar({
  project,
  rangeStart,
  rangeDays,
  isEditing,
  onSelect,
  onChangePeriod,
}: IProjectBarProps) {
  const { bar, handleClick, handleMovePointerDown, handleLostPointerCapture } =
    useProjectBar({
      project,
      rangeStart,
      rangeDays,
      isEditing,
      onSelect,
      onChangePeriod,
    })
  if (bar === null) return null

  return (
    <>
      <button
        type="button"
        className={bar.className}
        style={bar.style}
        title={bar.title}
        onClick={handleClick}
        onPointerDown={handleMovePointerDown}
        onLostPointerCapture={handleLostPointerCapture}
      >
        {bar.resizeStartHandle && (
          <span
            aria-hidden="true"
            className={bar.resizeStartHandle.className}
            onPointerDown={bar.resizeStartHandle.onPointerDown}
          />
        )}
        {bar.label}
        {bar.resizeEndHandle && (
          <span
            aria-hidden="true"
            className={bar.resizeEndHandle.className}
            onPointerDown={bar.resizeEndHandle.onPointerDown}
          />
        )}
      </button>
      {bar.periodLabel && (
        <span
          className={bar.periodLabel.className}
          style={bar.periodLabel.style}
        >
          {bar.periodLabel.text}
        </span>
      )}
    </>
  )
}
