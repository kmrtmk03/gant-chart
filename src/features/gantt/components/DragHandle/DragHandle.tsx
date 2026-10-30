import type { PointerEvent as ReactPointerEvent } from "react"

import { useDragHandle } from "./useDragHandle"

interface IDragHandleProps {
  /** 読み上げ用のラベル（例: 「案件A の並び順を変更」） */
  label: string
  /** この行をドラッグしている間 true（カーソルを grabbing にする） */
  isDragging: boolean
  /**
   * true の間はつかめない見た目にする（管理ダイアログの保存中など。省略時は false）。
   * ドラッグを始めない判定は呼び出し側のフックが行う
   */
  isDisabled?: boolean
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onLostPointerCapture: () => void
}

/**
 * 並び替え用のつかみ（縦の点 6 つ）。左のリストの案件の行と、担当者の管理ダイアログの行で使う。
 * ドラッグの処理は持たず、`useDragReorder` のハンドラーを受け取ってつなぐだけ。
 * MEMO: キーボードでは並び替えられないので、Tab で止まらないようにしている（tabIndex=-1）
 */
export function DragHandle({
  label,
  isDragging,
  isDisabled = false,
  onPointerDown,
  onLostPointerCapture,
}: IDragHandleProps) {
  const { className } = useDragHandle({ isDragging, isDisabled })

  return (
    <button
      type="button"
      tabIndex={-1}
      className={className}
      aria-label={label}
      aria-disabled={isDisabled}
      onPointerDown={onPointerDown}
      onLostPointerCapture={onLostPointerCapture}
    >
      ⋮⋮
    </button>
  )
}
