import { useCallback, useState } from "react"

import type { TProjectUpdate } from "../gantt.type"
import { toError } from "../utils/error.utils"
import type { TProjectPeriod } from "../utils/layout.utils"

interface IUseBarPeriodChangeParams {
  /**
   * 案件を部分更新して保存する（`useProjects.updateProject`）。
   * 失敗したら例外を投げる契約。参照が変わるとこのフックの `changePeriod` も変わるので、
   * `Timeline` の React.memo を保つため、参照が変わらないものを渡すこと
   */
  updateProject: (id: string, input: TProjectUpdate) => Promise<unknown>
}

/**
 * 帯のドラッグで変えた期間の保存と、失敗したときのエラーを持つ（`useGanttPage` から切り出したもの）。
 * 渡された期間は `updateProject` に開始日・終了日だけを渡す部分更新で保存する。
 * エラーは画面の下に出し、閉じるか次の保存で消す。
 */
export function useBarPeriodChange({
  updateProject,
}: IUseBarPeriodChangeParams) {
  const [error, setError] = useState<Error | null>(null)

  /**
   * 帯のドラッグで変えた期間を保存する。失敗は例外にせず `error` に載せる
   * （帯は保存が終わると元の位置に戻るので、失敗したことを画面で知らせる）。
   * 呼び出し側（帯のドラッグ）は例外が飛ばない前提なので、この関数は reject しない。
   * 参照は `updateProject` が変わらない限り同じ。
   */
  const changePeriod = useCallback(
    async (projectId: string, period: TProjectPeriod) => {
      setError(null)
      try {
        await updateProject(projectId, period)
      } catch (caught) {
        setError(toError(caught))
      }
    },
    [updateProject],
  )

  /** エラーの表示を閉じる */
  const dismissError = useCallback(() => {
    setError(null)
  }, [])

  return {
    // 期間の保存
    changePeriod,
    // 失敗したときのエラー（なければ null）
    error,
    dismissError,
  }
}
