import { useCallback, useEffect, useRef } from "react"
import type { SyntheticEvent } from "react"

interface IUseConfirmDialogParams {
  /** 開いているか。`<dialog>` の開閉はこの値に合わせる */
  isOpen: boolean
  /** 確認後の処理を実行中か。実行中は Esc でも閉じない */
  isBusy: boolean
  onCancel: () => void
}

/**
 * `ConfirmDialog` 専用のフック。`<dialog>` 要素の開閉と Esc の扱いを受け持つ。
 * 返す `dialogRef` は必ず `<dialog>` の `ref` に渡すこと（渡さないと開閉が反映されない）。
 */
export function useConfirmDialog({
  isOpen,
  isBusy,
  onCancel,
}: IUseConfirmDialogParams) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  // isOpen を正として、<dialog> の開閉を合わせる
  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog === null) return
    if (isOpen && !dialog.open) dialog.showModal()
    if (!isOpen && dialog.open) dialog.close()
  }, [isOpen])

  /** Esc での閉じは <dialog> に任せず親の state に反映する（state と見た目をずらさない） */
  const handleCancel = useCallback(
    (event: SyntheticEvent<HTMLDialogElement>) => {
      event.preventDefault()
      if (!isBusy) onCancel()
    },
    [isBusy, onCancel],
  )

  return {
    // <dialog> に渡すもの
    dialogRef,
    handleCancel,
  }
}
