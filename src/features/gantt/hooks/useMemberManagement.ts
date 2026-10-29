import { useCallback, useState } from "react"

import type { IMember, TMemberInput, TMoveDirection } from "../gantt.type"
import { moveId } from "../gantt.utils"

interface IUseMemberManagementParams {
  /** 担当者の一覧。未読み込み（null）の間は並び替えを見送る */
  members: IMember[] | null
  createMember: (input: TMemberInput) => Promise<IMember>
  renameMember: (id: string, name: string) => Promise<IMember>
  reorderMembers: (orderedIds: string[]) => Promise<void>
  deleteMember: (id: string) => Promise<void>
  /** 担当者の削除後に、その担当者の案件を一覧から取り除く（repository が配下の案件も消すため） */
  removeProjectsOfMember: (memberId: string) => void
  /** サイドパネルを閉じる。管理ダイアログを開くときに呼ぶ */
  closeSidePanel: () => void
}

/**
 * 担当者の管理ダイアログの開閉と、ダイアログから呼ぶ操作（追加・名前変更・並び替え・削除）をまとめる。
 * `useMembers`（担当者）と `useProjects`（案件）をつなぐ役目で、`useGanttPage` から使う。
 *
 * - 操作はどれも失敗したら例外をそのまま投げる。ダイアログ側が受け取って表示する
 * - 管理ダイアログを開くときはサイドパネルを閉じる。パネルに残った担当者の選択や、
 *   削除した担当者の案件を編集中のままになる状態を作らないため（入力途中の内容は破棄される）
 */
export function useMemberManagement({
  members,
  createMember,
  renameMember,
  reorderMembers,
  deleteMember,
  removeProjectsOfMember,
  closeSidePanel,
}: IUseMemberManagementParams) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  /** 管理ダイアログを開く */
  const openDialog = useCallback(() => {
    closeSidePanel()
    setIsDialogOpen(true)
  }, [closeSidePanel])

  /** 管理ダイアログを閉じる */
  const closeDialog = useCallback(() => {
    setIsDialogOpen(false)
  }, [])

  /** 担当者を追加する（名前は検証・前後の空白の除去を済ませて渡すこと） */
  const handleCreate = useCallback(
    async (name: string) => {
      await createMember({ name })
    },
    [createMember],
  )

  /** 担当者の名前を変える（名前は検証・前後の空白の除去を済ませて渡すこと） */
  const handleRename = useCallback(
    async (id: string, name: string) => {
      await renameMember(id, name)
    },
    [renameMember],
  )

  /** 担当者を 1 つ上 / 下へ動かす。端や未読み込みのときは何もしない */
  const handleMove = useCallback(
    async (id: string, direction: TMoveDirection) => {
      if (members === null) return
      const orderedIds = moveId(
        members.map((member) => member.id),
        id,
        direction,
      )
      if (orderedIds === null) return
      await reorderMembers(orderedIds)
    },
    [members, reorderMembers],
  )

  /**
   * 担当者を削除し、配下の案件が消えたことを反映する。
   * 案件は読み込み直さず手元の一覧から取り除く（削除は済んでいるので、ここで失敗を起こさない）
   */
  const handleDelete = useCallback(
    async (id: string) => {
      await deleteMember(id)
      removeProjectsOfMember(id)
    },
    [deleteMember, removeProjectsOfMember],
  )

  return {
    // 管理ダイアログの開閉
    isDialogOpen,
    openDialog,
    closeDialog,
    // ダイアログから呼ぶ操作
    createMember: handleCreate,
    renameMember: handleRename,
    moveMember: handleMove,
    deleteMember: handleDelete,
  }
}
