import { useCallback, useEffect, useState } from "react"

import type { IMember, TMemberInput } from "../gantt.type"
import { toError } from "../gantt.utils"
import type { IGanttRepository } from "../repositories/ganttRepository.type"

/**
 * 担当者の一覧を repository から読み込んで保持し、追加・名前変更・並び替え・削除の操作を提供する。
 * 読み込みはクライアント側の useEffect で行う（localStorage はサーバー側で読めないため）。
 * 操作は repository への保存が成功してから state を更新する。
 * 失敗したときは state を変えずにエラーをそのまま投げるので、呼び出し側（管理ダイアログ）で表示すること。
 * 担当者を削除すると repository が配下の案件も消すため、呼び出し側で案件の一覧も読み込み直すこと。
 *
 * @param repository コンポーネントの外で 1 回だけ作ったものを渡すこと（毎回変わると再読み込みが走る）
 */
export function useMembers(repository: IGanttRepository) {
  // null は「まだ読み込めていない」状態。空配列（担当者 0 人）と区別する
  const [members, setMembers] = useState<IMember[] | null>(null)
  const [error, setError] = useState<Error | null>(null)

  /** 担当者を読み込み直す。他のフックがデータを書き換えた後に呼ぶこと */
  const reloadMembers = useCallback(async () => {
    try {
      setMembers(await repository.listMembers())
      setError(null)
    } catch (caught) {
      setError(toError(caught))
    }
  }, [repository])

  // 初回の読み込み。アンマウント後に結果が返っても state を更新しない。
  // MEMO: reloadMembers を呼ばずに直接書いているのは、effect 内で同期的に setState を呼ばないため
  useEffect(() => {
    let isCancelled = false
    repository
      .listMembers()
      .then((loaded) => {
        if (!isCancelled) setMembers(loaded)
      })
      .catch((caught: unknown) => {
        if (!isCancelled) setError(toError(caught))
      })
    return () => {
      isCancelled = true
    }
  }, [repository])

  /** 担当者を追加する。保存に成功したら一覧の末尾（表示順は一番下）に足す */
  const createMember = useCallback(
    async (input: TMemberInput) => {
      const created = await repository.createMember(input)
      // 未読み込み（null）の間は触らない。読み込み完了時に保存済みの内容が入る
      setMembers((prev) => (prev === null ? prev : [...prev, created]))
      return created
    },
    [repository],
  )

  /** 担当者の名前を変える。保存に成功したら一覧の該当の 1 件を差し替える */
  const renameMember = useCallback(
    async (id: string, name: string) => {
      const updated = await repository.updateMember(id, { name })
      setMembers((prev) =>
        prev === null
          ? prev
          : prev.map((member) => (member.id === id ? updated : member)),
      )
      return updated
    },
    [repository],
  )

  /**
   * 担当者を並び替える。`orderedIds` は全担当者の id を過不足なく 1 回ずつ含めること。
   * 保存に成功したら、repository が返した並び替え後の一覧で置き換える
   */
  const reorderMembers = useCallback(
    async (orderedIds: string[]) => {
      setMembers(await repository.reorderMembers(orderedIds))
    },
    [repository],
  )

  /** 担当者を削除する（配下の案件も repository が削除する）。保存に成功したら一覧から取り除く */
  const deleteMember = useCallback(
    async (id: string) => {
      await repository.deleteMember(id)
      setMembers((prev) =>
        prev === null ? prev : prev.filter((member) => member.id !== id),
      )
    },
    [repository],
  )

  return {
    // 状態
    members,
    membersError: error,
    // 操作
    reloadMembers,
    createMember,
    renameMember,
    reorderMembers,
    deleteMember,
  }
}
