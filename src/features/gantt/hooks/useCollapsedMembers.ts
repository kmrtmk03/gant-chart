import { useCallback, useState } from "react"

/**
 * 折りたたみ中の担当者 ID の集合を持つ。保存はしない（再読み込みすると全員が開いた状態に戻る）。
 */
export function useCollapsedMembers() {
  const [collapsedMemberIds, setCollapsedMemberIds] = useState<
    ReadonlySet<string>
  >(() => new Set())

  /** 担当者の開閉を切り替える */
  const toggleMember = useCallback((memberId: string) => {
    setCollapsedMemberIds((prev) => {
      const next = new Set(prev)
      if (next.has(memberId)) {
        next.delete(memberId)
      } else {
        next.add(memberId)
      }
      return next
    })
  }, [])

  return {
    // 状態
    collapsedMemberIds,
    // 操作
    toggleMember,
  }
}
