import { useCallback, useEffect, useState } from "react"

import type { IProject } from "../gantt.type"
import { toError } from "../gantt.utils"
import type { IGanttRepository } from "../repositories/ganttRepository.type"

/**
 * 案件の一覧を repository から読み込んで保持する。
 * 読み込みはクライアント側の useEffect で行う（localStorage はサーバー側で読めないため）。
 * TODO: 追加・編集・削除の操作はフェーズ 6 でここに足す。
 *
 * @param repository コンポーネントの外で 1 回だけ作ったものを渡すこと（毎回変わると再読み込みが走る）
 */
export function useProjects(repository: IGanttRepository) {
  // null は「まだ読み込めていない」状態。空配列（案件 0 件）と区別する
  const [projects, setProjects] = useState<IProject[] | null>(null)
  const [error, setError] = useState<Error | null>(null)

  /** 案件を読み込み直す。他のフックがデータを書き換えた後に呼ぶこと */
  const reloadProjects = useCallback(async () => {
    try {
      setProjects(await repository.listProjects())
      setError(null)
    } catch (caught) {
      setError(toError(caught))
    }
  }, [repository])

  // 初回の読み込み。アンマウント後に結果が返っても state を更新しない。
  // MEMO: reloadProjects を呼ばずに直接書いているのは、effect 内で同期的に setState を呼ばないため
  useEffect(() => {
    let isCancelled = false
    repository
      .listProjects()
      .then((loaded) => {
        if (!isCancelled) setProjects(loaded)
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
    projects,
    projectsError: error,
    // 操作
    reloadProjects,
  }
}
