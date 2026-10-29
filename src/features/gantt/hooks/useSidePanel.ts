import { useCallback, useState } from "react"

import type { TSidePanelState } from "../gantt.type"

/**
 * サイドパネルの開閉と、何を開いているか（追加 / 編集）を 1 つの state で持つ。
 * 編集中の案件の中身は持たない。`sidePanelState.projectId` から案件の一覧を引いて求めること。
 */
export function useSidePanel() {
  const [sidePanelState, setSidePanelState] = useState<TSidePanelState>({
    mode: "closed",
  })

  /** 追加用に開く。`defaultMemberId` の担当者が初期選択になる */
  const openCreatePanel = useCallback((defaultMemberId: string | null) => {
    setSidePanelState({ mode: "create", defaultMemberId })
  }, [])

  /** 編集用に開く（帯をクリックしたとき） */
  const openEditPanel = useCallback((projectId: string) => {
    setSidePanelState({ mode: "edit", projectId })
  }, [])

  /** 閉じる */
  const closePanel = useCallback(() => {
    setSidePanelState({ mode: "closed" })
  }, [])

  return {
    // 状態
    sidePanelState,
    // 操作
    openCreatePanel,
    openEditPanel,
    closePanel,
  }
}
