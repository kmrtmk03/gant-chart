import { useCallback, useState } from "react"
import type { FormEvent } from "react"

import type {
  IMember,
  IProject,
  TDateString,
  TProjectInput,
} from "../../gantt.type"
import { toError } from "../../gantt.utils"
import type { IProjectFormValues, TProjectFormErrors } from "./projectForm.type"
import {
  createInitialFormValues,
  toProjectInput,
  validateProjectForm,
} from "./projectForm.utils"

interface IUseProjectFormParams {
  /** 担当者の選択肢。検証にも使う */
  members: IMember[]
  /** 編集する案件。追加のときは null */
  project: IProject | null
  /** 追加のときの担当者の初期選択 */
  defaultMemberId: string | null
  today: TDateString
  /**
   * 保存する。失敗したら例外を投げること（フォームがパネル内に表示する）。成功したら呼び出し側がパネルを閉じる。
   * `isCompleted` は完了ボタンから保存するときだけ渡す（省略は完了の状態を変えない）
   */
  onSubmit: (input: TProjectInput, isCompleted?: boolean) => Promise<void>
  /** 削除する。失敗したら例外を投げること。編集のときだけ使う */
  onDelete: () => Promise<void>
}

/**
 * サイドパネルのフォーム専用のフック。入力値・検証結果・送信（保存 / 削除）を受け持つ。
 * 初期値は初回の描画で 1 度だけ決める。別の案件や担当者で開き直すときは、
 * 呼び出し側のコンポーネントに `key` を付けて作り直すこと（effect で同期しない）。
 */
export function useProjectForm({
  members,
  project,
  defaultMemberId,
  today,
  onSubmit,
  onDelete,
}: IUseProjectFormParams) {
  const [values, setValues] = useState<IProjectFormValues>(() =>
    createInitialFormValues(members, project, defaultMemberId, today),
  )
  const [errors, setErrors] = useState<TProjectFormErrors>({})
  // 保存・削除に失敗したときの理由。パネルを閉じずに表示する
  const [submitError, setSubmitError] = useState<Error | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)

  /** 1 項目を書き換える。直したことがわかるよう、その項目のエラーは消す */
  const setField = useCallback(
    <TKey extends keyof IProjectFormValues>(
      key: TKey,
      value: IProjectFormValues[TKey],
    ) => {
      setValues((prev) => ({ ...prev, [key]: value }))
      setErrors((prev) =>
        prev[key] === undefined ? prev : { ...prev, [key]: undefined },
      )
    },
    [],
  )

  /** 保存・削除に共通の実行処理。二重送信を防ぎ、失敗を `submitError` に載せる */
  const runSubmit = useCallback(
    async (action: () => Promise<void>) => {
      if (isSubmitting) return
      setIsSubmitting(true)
      setSubmitError(null)
      try {
        await action()
      } catch (caught) {
        setSubmitError(toError(caught))
      } finally {
        setIsSubmitting(false)
      }
    },
    [isSubmitting],
  )

  /**
   * 入力をまとめて検証し、エラーがなければ保存する（保存ボタン・完了ボタンに共通）。
   * `isCompleted` を渡すと完了の状態も一緒に保存する。検証で失敗したら完了の状態も変えない
   */
  const submitForm = useCallback(
    async (isCompleted?: boolean) => {
      const nextErrors = validateProjectForm(values, members)
      setErrors(nextErrors)
      if (Object.keys(nextErrors).length > 0) return
      await runSubmit(() => onSubmit(toProjectInput(values), isCompleted))
    },
    [values, members, runSubmit, onSubmit],
  )

  /** フォームの送信（保存ボタン）。完了の状態は変えない */
  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      await submitForm()
    },
    [submitForm],
  )

  /**
   * 完了ボタン。編集途中の内容が失われないよう、フォームの内容と一緒に完了・未完了を切り替えて保存する。
   * 編集のときだけ使う（追加のときは何もしない）
   */
  const handleToggleCompleted = useCallback(async () => {
    if (project === null) return
    await submitForm(project.completedAt === null)
  }, [project, submitForm])

  /** 削除の確認ダイアログを開く */
  const openDeleteConfirm = useCallback(() => {
    setIsConfirmingDelete(true)
  }, [])

  /** 削除の確認ダイアログを閉じる（削除はしない） */
  const closeDeleteConfirm = useCallback(() => {
    setIsConfirmingDelete(false)
  }, [])

  /** 確認ダイアログで「削除」を押したとき。失敗したらダイアログを閉じ、エラーをパネル内に出す */
  const handleConfirmDelete = useCallback(async () => {
    await runSubmit(onDelete)
    setIsConfirmingDelete(false)
  }, [runSubmit, onDelete])

  return {
    // 入力
    values,
    errors,
    setField,
    // 送信
    isSubmitting,
    submitError,
    handleSubmit,
    handleToggleCompleted,
    // 削除の確認
    isConfirmingDelete,
    openDeleteConfirm,
    closeDeleteConfirm,
    handleConfirmDelete,
  }
}
