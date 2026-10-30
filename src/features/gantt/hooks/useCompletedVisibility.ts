import { useCallback, useState } from "react"

/**
 * 完了済みの案件をガントチャートに表示するかを持つ。
 * 初期値は「表示しない」。データではなく見た目の設定なので保存しない（再読み込みすると「表示しない」に戻る）。
 */
export function useCompletedVisibility() {
  const [isCompletedVisible, setIsCompletedVisible] = useState(false)

  /** 表示する / しないを切り替える */
  const toggleCompletedVisible = useCallback(() => {
    setIsCompletedVisible((prev) => !prev)
  }, [])

  return {
    // 状態
    isCompletedVisible,
    // 操作
    toggleCompletedVisible,
  }
}
