import { useCallback, useState } from "react"

import { toError } from "../utils/error.utils"
import { moveIdAmongVisible } from "../utils/reorder.utils"
import type { IMemberGroup } from "../utils/member.utils"

/**
 * 並び替えた案件を、手元の案件の一覧から見つけられなかったときの文言。
 * 別のタブで案件・担当者が削除された直後などに起きる（一覧を読み込み直せば直る）
 */
const STALE_PROJECTS_MESSAGE =
  "案件の一覧が古くなっています。ページを再読み込みしてから並べ替えてください"

interface IUseProjectReorderParams {
  /**
   * 完了済みも含めた全体の担当者・案件（`useGanttPage` の `allMemberGroups`。読み込み前は null）。
   * 隠れている完了済みの案件の前後関係を保つため、画面に出すもの（`memberGroups`）ではなくこちらを渡すこと
   */
  allMemberGroups: IMemberGroup[] | null
  /**
   * その担当者の案件の並びを保存する（`useProjects.reorderProjects`）。
   * 担当者の全案件の id を過不足なく渡す契約で、失敗したら例外を投げる
   */
  reorderProjects: (memberId: string, orderedIds: string[]) => Promise<unknown>
}

/**
 * 左のリストでの案件の並び替えの保存と、失敗したときのエラーを持つ（`useGanttPage` から切り出したもの）。
 * エラーは画面の下に出し、閉じるか次の保存で消す。
 */
export function useProjectReorder({
  allMemberGroups,
  reorderProjects,
}: IUseProjectReorderParams) {
  const [error, setError] = useState<Error | null>(null)

  /**
   * 左のリストのドラッグで並べ替えた案件の並びを保存する。失敗は例外にせず `error` に載せる
   * （リストは保存が終わると元の並びに戻るので、失敗したことを画面で知らせる）。
   *
   * `orderedVisibleIds` は見えている案件（完了済みを隠しているときは未完了だけ）の並べ替え後の並び、
   * `movedId` は動かした案件。repository にはその担当者の全案件の id を渡す必要があるので、
   * 隠れている完了済みの案件の前後関係を保って全体の並びに戻してから保存する（`moveIdAmongVisible`）。
   * 呼び出し側（`useDragReorder`）は例外が飛ばない前提なので、この関数は reject しない。
   * 参照は `reorderProjects` と案件の一覧が変わらない限り同じ（`MemberList` の React.memo を保つため）。
   */
  const reorder = useCallback(
    async (memberId: string, orderedVisibleIds: string[], movedId: string) => {
      setError(null)
      // 全体の並び（表示順）
      const allIds = allMemberGroups
        ?.find((group) => group.member.id === memberId)
        ?.projects.map((project) => project.id)
      // 並べ替える前の見えている並び（全体の並びから、見えている id だけを同じ順で取り出す）
      const visibleIdSet = new Set(orderedVisibleIds)
      const orderedIds =
        allIds === undefined
          ? null
          : moveIdAmongVisible(
              allIds,
              allIds.filter((id) => visibleIdSet.has(id)),
              movedId,
              orderedVisibleIds.indexOf(movedId),
            )
      // 担当者・動かした案件が手元の一覧に見つからない（別のタブで削除された直後など）ときは保存しない。
      // 見えている並びのまま渡すと、完了済みを隠しているときに id が足りず、
      // repository の分かりにくい検証エラーになるため、原因の分かる文言を出す
      if (orderedIds === null) {
        setError(new Error(STALE_PROJECTS_MESSAGE))
        return
      }
      try {
        await reorderProjects(memberId, orderedIds)
      } catch (caught) {
        setError(toError(caught))
      }
    },
    [allMemberGroups, reorderProjects],
  )

  /** エラーの表示を閉じる */
  const dismissError = useCallback(() => {
    setError(null)
  }, [])

  return {
    // 並びの保存
    reorder,
    // 失敗したときのエラー（なければ null）
    error,
    dismissError,
  }
}
