import { useEffect, useRef } from "react"

import styles from "./ConfirmDialog.module.scss"

interface IConfirmDialogProps {
  /** 開いているか。開閉は必ずこの props で行う（Esc で閉じるときも `onCancel` 経由で親が false にする） */
  isOpen: boolean
  title: string
  message: string
  confirmLabel: string
  /** 確認後の処理を実行中か。実行中はボタンを押せない */
  isBusy: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * 破壊的な操作（削除など）の確認ダイアログ。`<dialog>` 要素を showModal で開く。
 * 背面は操作できなくなり、フォーカスは最初のボタン（キャンセル）に当たる。
 * フェーズ 7（担当者の削除）でも使う。
 */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  isBusy,
  onConfirm,
  onCancel,
}: IConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  // isOpen を正として、<dialog> の開閉を合わせる
  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog === null) return
    if (isOpen && !dialog.open) dialog.showModal()
    if (!isOpen && dialog.open) dialog.close()
  }, [isOpen])

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="confirm-dialog-title"
      // Esc での閉じは、<dialog> に任せず親の state に反映する（state と見た目をずらさない）
      onCancel={(event) => {
        event.preventDefault()
        if (!isBusy) onCancel()
      }}
    >
      <h2 id="confirm-dialog-title" className={styles.title}>
        {title}
      </h2>
      <p className={styles.message}>{message}</p>
      <div className={styles.actions}>
        <button type="button" disabled={isBusy} onClick={onCancel}>
          キャンセル
        </button>
        <button
          type="button"
          className={styles.confirm}
          disabled={isBusy}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  )
}
