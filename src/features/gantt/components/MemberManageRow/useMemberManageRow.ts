import { useCallback, useState } from "react"
import type { ChangeEvent, FormEvent } from "react"

import type { IMember } from "../../gantt.type"
import { hasSameNameMember, validateMemberName } from "../../gantt.utils"

interface IUseMemberManageRowParams {
  member: IMember
  /** 全担当者。名前の重複の警告に使う */
  members: IMember[]
  /** 名前を保存する。成功したら true、失敗したら false（失敗の表示は呼び出し側が持つ） */
  onRename: (memberId: string, name: string) => Promise<boolean>
}

/**
 * `MemberManageRow` 専用のフック。名前の入力中の値（下書き）・検証・保存を受け持つ。
 * 下書きの初期値は初回の描画で決めるため、呼び出し側で担当者の `id` を `key` にすること。
 * 保存は Enter（フォーム送信）と入力欄から離れたとき（blur）の両方で走りうる。
 * 二重に保存しないのは `onRename` 側の役目（`useMemberManageDialog.runAction` が実行中は 2 回目を見送る）。
 * 見送られた側は false が返るだけで、下書きは 1 回目の成功で更新される。
 */
export function useMemberManageRow({
  member,
  members,
  onRename,
}: IUseMemberManageRowParams) {
  const [draftName, setDraftName] = useState(member.name)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // 重複は登録を止めない警告。入力のたびに計算できるので state にしない
  const warningMessage = hasSameNameMember(draftName, members, member.id)
    ? "同じ名前の担当者がいます"
    : null

  /** 入力欄の変更。直したことがわかるよう、エラーは消す */
  const handleChangeName = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setDraftName(event.target.value)
      setErrorMessage(null)
    },
    [],
  )

  /** 名前を確定する。変更がなければ下書きを整えるだけで、検証に通らなければ保存しない */
  const commitName = useCallback(async () => {
    const trimmed = draftName.trim()
    if (trimmed === member.name) {
      setDraftName(member.name)
      setErrorMessage(null)
      return
    }
    const validationError = validateMemberName(trimmed)
    if (validationError !== null) {
      setErrorMessage(validationError)
      return
    }
    const isSaved = await onRename(member.id, trimmed)
    if (isSaved) setDraftName(trimmed)
  }, [draftName, member.id, member.name, onRename])

  /** Enter での送信。ページ遷移させず、blur と同じ確定処理を行う */
  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      void commitName()
    },
    [commitName],
  )

  return {
    // 入力
    draftName,
    errorMessage,
    warningMessage,
    handleChangeName,
    handleSubmit,
    handleBlur: commitName,
  }
}
