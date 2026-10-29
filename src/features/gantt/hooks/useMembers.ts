import { useCallback, useEffect, useState } from "react"

import type { IMember } from "../gantt.type"
import { toError } from "../gantt.utils"
import type { IGanttRepository } from "../repositories/ganttRepository.type"

/**
 * 担当者の一覧を repository から読み込んで保持する。
 * 読み込みはクライアント側の useEffect で行う（localStorage はサーバー側で読めないため）。
 * TODO: 追加・編集・削除の操作はフェーズ 7 でここに足す。
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

  return {
    // 状態
    members,
    membersError: error,
    // 操作
    reloadMembers,
  }
}
