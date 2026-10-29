import { useCallback, useEffect, useId, useRef, useState } from "react"
import type { ChangeEvent, FormEvent, SyntheticEvent } from "react"

import type { TMoveDirection } from "../../gantt.type"
import {
  hasSameNameMember,
  toError,
  validateMemberName,
} from "../../gantt.utils"
import type { IMemberGroup } from "../../gantt.utils"

interface IUseMemberManageDialogParams {
  /** 担当者（表示順）と配下の案件。案件の数の表示と、削除の確認に使う */
  memberGroups: IMemberGroup[]
  /** 追加。名前は検証・trim 済みで渡す。失敗したら例外を投げること */
  onCreate: (name: string) => Promise<void>
  /** 名前変更。名前は検証・trim 済みで渡す。失敗したら例外を投げること */
  onRename: (memberId: string, name: string) => Promise<void>
  /** 1 つ上 / 下へ動かす。失敗したら例外を投げること */
  onMove: (memberId: string, direction: TMoveDirection) => Promise<void>
  /** 削除（配下の案件も消える）。失敗したら例外を投げること */
  onDelete: (memberId: string) => Promise<void>
  onClose: () => void
}

/**
 * `MemberManageDialog` 専用のフック。`<dialog>` の開閉と、追加・名前変更・並び替え・削除の実行を受け持つ。
 * - コンポーネントがマウントされている間が「開いている」。マウント時に showModal し、
 *   外す（アンマウント）と閉じる。開き直すたびに入力中の値やエラーは作り直される
 * - 保存系の操作は 1 つずつ実行し、実行中は `isBusy` で全ボタンを止める。失敗は `actionError` に載せて残す
 * - 返す `dialogRef` は必ず `<dialog>` の `ref` に、`titleId` は見出しの `id` と `aria-labelledby` に渡すこと
 */
export function useMemberManageDialog({
  memberGroups,
  onCreate,
  onRename,
  onMove,
  onDelete,
  onClose,
}: IUseMemberManageDialogParams) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [isBusy, setIsBusy] = useState(false)
  // 実行中かどうかの判定用。state の `isBusy` は再描画されるまで古い値のままなので、
  // Enter と blur が続けて走るような短い間の二重実行は、こちらで確実に弾く
  const isBusyRef = useRef(false)
  // 保存系の操作に失敗したときの理由。次の操作を始めるまで表示する
  const [actionError, setActionError] = useState<Error | null>(null)
  const [newName, setNewName] = useState("")
  const [newNameError, setNewNameError] = useState<string | null>(null)
  // 削除の確認を出している担当者の ID。null なら確認は出さない
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null)

  // マウント中は <dialog> を開いておく。閉じるとき（アンマウント）は close して元のフォーカスに戻す
  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog === null) return
    if (!dialog.open) dialog.showModal()
    return () => {
      if (dialog.open) dialog.close()
    }
  }, [])

  /**
   * Esc での閉じは <dialog> に任せず親の state に反映する。保存中は閉じない。
   * 中に置いた削除の確認ダイアログの Esc も React 上では親のこのハンドラへ伝わるため、
   * 発生元がこの <dialog> 自身のときだけ処理する（確認だけを閉じ、管理ダイアログは残す）
   */
  const handleCancel = useCallback(
    (event: SyntheticEvent<HTMLDialogElement>) => {
      if (event.target !== event.currentTarget) return
      event.preventDefault()
      if (!isBusy) onClose()
    },
    [isBusy, onClose],
  )

  /**
   * 保存系の操作の共通の実行処理。実行中は二重に走らせず（`isBusyRef` で判定）、失敗を `actionError` に載せる。
   * 成功したら true、失敗（または実行中で見送り）なら false を返す。
   */
  const runAction = useCallback(
    async (action: () => Promise<void>): Promise<boolean> => {
      if (isBusyRef.current) return false
      isBusyRef.current = true
      setIsBusy(true)
      setActionError(null)
      try {
        await action()
        return true
      } catch (caught) {
        setActionError(toError(caught))
        return false
      } finally {
        isBusyRef.current = false
        setIsBusy(false)
      }
    },
    [],
  )

  /** 行から呼ぶ名前変更 */
  const handleRename = useCallback(
    (memberId: string, name: string) =>
      runAction(() => onRename(memberId, name)),
    [runAction, onRename],
  )

  /** 行から呼ぶ並び替え */
  const handleMove = useCallback(
    (memberId: string, direction: TMoveDirection) => {
      void runAction(() => onMove(memberId, direction))
    },
    [runAction, onMove],
  )

  // ---- 追加 ----

  const members = memberGroups.map((group) => group.member)
  // 重複は登録を止めない警告。入力のたびに計算できるので state にしない
  const newNameWarning = hasSameNameMember(newName, members)
    ? "同じ名前の担当者がいます"
    : null

  /** 追加欄の入力。直したことがわかるよう、エラーは消す */
  const handleChangeNewName = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setNewName(event.target.value)
      setNewNameError(null)
    },
    [],
  )

  /** 追加の送信。検証に通らなければ保存せず、成功したら入力欄を空にする */
  const handleSubmitNew = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const validationError = validateMemberName(newName)
      if (validationError !== null) {
        setNewNameError(validationError)
        return
      }
      const isCreated = await runAction(() => onCreate(newName.trim()))
      if (isCreated) setNewName("")
    },
    [newName, runAction, onCreate],
  )

  // ---- 削除の確認 ----

  const deletingGroup =
    memberGroups.find((group) => group.member.id === deletingMemberId) ?? null

  /** 削除ボタンを押したとき。確認ダイアログを出す */
  const requestDelete = useCallback((memberId: string) => {
    setDeletingMemberId(memberId)
  }, [])

  /** 確認ダイアログを閉じる（削除はしない） */
  const cancelDelete = useCallback(() => {
    setDeletingMemberId(null)
  }, [])

  /** 確認ダイアログで「削除する」を押したとき。成否にかかわらず確認は閉じ、失敗は `actionError` に出す */
  const confirmDelete = useCallback(async () => {
    if (deletingMemberId === null) return
    await runAction(() => onDelete(deletingMemberId))
    setDeletingMemberId(null)
  }, [deletingMemberId, runAction, onDelete])

  // 案件を持つ担当者は、一緒に消える件数を確認に出す
  const deleteConfirmMessage =
    deletingGroup === null
      ? ""
      : deletingGroup.projects.length > 0
        ? `「${deletingGroup.member.name}」を削除します。案件 ${deletingGroup.projects.length} 件も一緒に削除されます。この操作は元に戻せません。`
        : `「${deletingGroup.member.name}」を削除します。この操作は元に戻せません。`

  return {
    // <dialog> に渡すもの
    dialogRef,
    titleId,
    handleCancel,
    // 一覧
    members,
    rows: memberGroups.map((group, index) => ({
      member: group.member,
      projectCount: group.projects.length,
      isFirst: index === 0,
      isLast: index === memberGroups.length - 1,
    })),
    isBusy,
    actionErrorMessage: actionError?.message ?? null,
    handleRename,
    handleMove,
    // 追加
    newName,
    newNameError,
    newNameWarning,
    handleChangeNewName,
    handleSubmitNew,
    // 削除の確認
    isConfirmingDelete: deletingGroup !== null,
    deleteConfirmMessage,
    requestDelete,
    cancelDelete,
    confirmDelete,
  }
}
