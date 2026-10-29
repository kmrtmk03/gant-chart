import { useCallback, useEffect, useState } from "react"

import type { IProject, TProjectInput, TProjectUpdate } from "../gantt.type"
import { toError } from "../gantt.utils"
import type { IGanttRepository } from "../repositories/ganttRepository.type"

/**
 * 案件の一覧を repository から読み込んで保持し、追加・編集・削除の操作を提供する。
 * 読み込みはクライアント側の useEffect で行う（localStorage はサーバー側で読めないため）。
 * 追加・編集・削除は repository への保存が成功してから state を更新する。
 * 失敗したときは state を変えずにエラーをそのまま投げるので、呼び出し側（フォーム）で表示すること。
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

  /** 案件を追加する。保存に成功したら一覧の末尾に足す（表示順は画面側で開始日順に並べる） */
  const createProject = useCallback(
    async (input: TProjectInput) => {
      const created = await repository.createProject(input)
      // 未読み込み（null）の間は触らない。読み込み完了時に保存済みの内容が入る
      setProjects((prev) => (prev === null ? prev : [...prev, created]))
      return created
    },
    [repository],
  )

  /** 案件を書き換える。保存に成功したら一覧の該当の 1 件を差し替える */
  const updateProject = useCallback(
    async (id: string, input: TProjectUpdate) => {
      const updated = await repository.updateProject(id, input)
      setProjects((prev) =>
        prev === null
          ? prev
          : prev.map((project) => (project.id === id ? updated : project)),
      )
      return updated
    },
    [repository],
  )

  /** 案件を削除する。保存に成功したら一覧から取り除く */
  const deleteProject = useCallback(
    async (id: string) => {
      await repository.deleteProject(id)
      setProjects((prev) =>
        prev === null ? prev : prev.filter((project) => project.id !== id),
      )
    },
    [repository],
  )

  return {
    // 状態
    projects,
    projectsError: error,
    // 操作
    reloadProjects,
    createProject,
    updateProject,
    deleteProject,
  }
}
