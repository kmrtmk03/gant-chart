import { useCallback, useRef, useState } from "react"

import type { TSidePanelState } from "../gantt.type"

/**
 * サイドパネルの開閉と、何を開いているか（追加 / 編集）を 1 つの state で持つ。
 * 編集中の案件の中身は持たない。`sidePanelState.projectId` から案件の一覧を引いて求めること。
 *
 * 保存・削除の実行中（`runWhileBusy` の中）は、開く・閉じる・別の案件への切り替えをすべて受け付けない。
 * 実行中に閉じると、失敗したときのエラーと入力内容が見えなくなり、実行中に別のパネルを開くと、
 * 先の保存が成功したときに新しいパネルが閉じられてしまうため（Esc と同じ歯止め）。
 */
export function useSidePanel() {
  const [sidePanelState, setSidePanelState] = useState<TSidePanelState>({
    mode: "closed",
  })

  // 保存・削除の実行中か。描画には使わないので ref で持つ（参照が変わらず、各ハンドラの identity も安定する）
  const isBusyRef = useRef(false)

  /**
   * 保存・削除の処理を実行している間だけ、パネルの開閉を止める。失敗は例外のまま投げる。
   * 成功したあとにパネルを閉じるときは、この関数が終わってから `closePanel` を呼ぶこと
   * （実行中は `closePanel` も受け付けないため）
   */
  const runWhileBusy = useCallback(async (action: () => Promise<void>) => {
    isBusyRef.current = true
    try {
      await action()
    } finally {
      isBusyRef.current = false
    }
  }, [])

  /** 追加用に開く。`defaultMemberId` の担当者が初期選択になる */
  const openCreatePanel = useCallback((defaultMemberId: string | null) => {
    if (isBusyRef.current) return
    setSidePanelState({ mode: "create", defaultMemberId })
  }, [])

  /** 編集用に開く（帯をクリックしたとき） */
  const openEditPanel = useCallback((projectId: string) => {
    if (isBusyRef.current) return
    setSidePanelState({ mode: "edit", projectId })
  }, [])

  /** 閉じる */
  const closePanel = useCallback(() => {
    if (isBusyRef.current) return
    setSidePanelState({ mode: "closed" })
  }, [])

  return {
    // 状態
    sidePanelState,
    // 操作
    runWhileBusy,
    openCreatePanel,
    openEditPanel,
    closePanel,
  }
}
