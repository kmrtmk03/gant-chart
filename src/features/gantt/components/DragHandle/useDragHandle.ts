import styles from "./DragHandle.module.scss"

interface IUseDragHandleParams {
  isDragging: boolean
  isDisabled: boolean
}

/** `DragHandle` 専用のフック。状態に応じたクラス名を組み立てる */
export function useDragHandle({
  isDragging,
  isDisabled,
}: IUseDragHandleParams) {
  const className = [
    styles.handle,
    isDragging && styles.dragging,
    isDisabled && styles.disabled,
  ]
    .filter(Boolean)
    .join(" ")

  return { className }
}
