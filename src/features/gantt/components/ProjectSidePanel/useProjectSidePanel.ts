import { useCallback, useEffect, useId } from "react"
import type { ChangeEvent, CSSProperties } from "react"

import { BAR_COLORS } from "../../gantt.constants"
import { isBarColor } from "../../gantt.guards"
import type {
  IBarColorPreset,
  IMember,
  IProject,
  TBarColor,
  TDateString,
  TProjectInput,
} from "../../gantt.type"
import { formatCompletedLabel } from "./projectForm.utils"
import { useProjectForm } from "./useProjectForm"

/** 色の選択肢。BAR_COLORS のキーを型ガードで TBarColor に絞って並べる（型アサーションを避けるため） */
const COLOR_ENTRIES = Object.entries(BAR_COLORS).filter(
  (entry): entry is [TBarColor, IBarColorPreset] => isBarColor(entry[0]),
)

interface IUseProjectSidePanelParams {
  /** 担当者の選択肢（1 人以上） */
  members: IMember[]
  /** 編集する案件。追加のときは null */
  project: IProject | null
  /** 追加のときの担当者の初期選択 */
  defaultMemberId: string | null
  today: TDateString
  /**
   * 保存。失敗したら例外を投げること。成功したら呼び出し側がパネルを閉じる。
   * `isCompleted` は完了ボタンから保存するときだけ渡される（省略は完了の状態を変えない）
   */
  onSubmit: (input: TProjectInput, isCompleted?: boolean) => Promise<void>
  /** 削除（編集のときだけ使う）。失敗したら例外を投げること */
  onDelete: () => Promise<void>
  onClose: () => void
}

/** 帯の色の選択肢 1 つぶんの表示用の値 */
interface IColorOptionView {
  key: TBarColor
  label: string
  /** 色の見本に付ける背景色。値が動的なのでインラインスタイルで渡す */
  swatchStyle: CSSProperties
  isChecked: boolean
}

/**
 * `ProjectSidePanel` 専用のフック。フォーム（`useProjectForm`）に、パネルの表示用の値と入力欄のハンドラを足す。
 * - 開き直すとき（別の案件・別の担当者）は、呼び出し側で `key` を変えてフォームを作り直すこと
 * - Esc で閉じる。削除の確認ダイアログが開いている間は、ダイアログ側の Esc（確認を閉じる）を優先する。
 *   保存・削除の実行中は閉じない（結果を見失わないため）
 */
export function useProjectSidePanel({
  members,
  project,
  defaultMemberId,
  today,
  onSubmit,
  onDelete,
  onClose,
}: IUseProjectSidePanelParams) {
  const form = useProjectForm({
    members,
    project,
    defaultMemberId,
    today,
    onSubmit,
    onDelete,
  })
  const {
    values,
    errors,
    submitError,
    isSubmitting,
    isConfirmingDelete,
    setField,
  } = form
  const idPrefix = useId()
  const isEditing = project !== null
  const completedAt = project?.completedAt ?? null

  useEffect(() => {
    if (isConfirmingDelete || isSubmitting) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isConfirmingDelete, isSubmitting, onClose])

  // 入力欄の変更を、フォームの項目に反映する
  const handleChangeMember = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      setField("memberId", event.target.value)
    },
    [setField],
  )
  const handleChangeName = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setField("name", event.target.value)
    },
    [setField],
  )
  const handleChangeStartDate = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setField("startDate", event.target.value)
    },
    [setField],
  )
  const handleChangeEndDate = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setField("endDate", event.target.value)
    },
    [setField],
  )
  const handleChangeNote = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setField("note", event.target.value)
    },
    [setField],
  )
  const handleChangeColor = useCallback(
    (color: TBarColor) => {
      setField("color", color)
    },
    [setField],
  )

  const colorOptions: IColorOptionView[] = COLOR_ENTRIES.map(
    ([key, preset]) => ({
      key,
      label: preset.label,
      swatchStyle: { background: `var(${preset.cssVariable})` },
      isChecked: values.color === key,
    }),
  )

  return {
    // 表示用の値
    isEditing,
    title: isEditing ? "案件を編集" : "案件を追加",
    // 「状態」の欄の表示（例: "未完了" / "完了済み（10/30）"）
    isCompleted: completedAt !== null,
    statusLabel:
      completedAt === null ? "未完了" : formatCompletedLabel(completedAt),
    // 完了ボタンの文言（編集のときだけ出す）
    completeButtonLabel: completedAt === null ? "完了にする" : "未完了に戻す",
    // 削除は編集のときだけ使うので、追加のときは空にする
    deleteConfirmMessage: isEditing
      ? `「${project.name}」を削除します。この操作は元に戻せません。`
      : "",
    fieldIds: {
      member: `${idPrefix}-member`,
      name: `${idPrefix}-name`,
      startDate: `${idPrefix}-start`,
      endDate: `${idPrefix}-end`,
      note: `${idPrefix}-note`,
      color: `${idPrefix}-color`,
    },
    colorOptions,
    // 入力（値・エラー・各欄の変更ハンドラ）
    values,
    errors,
    handleChangeMember,
    handleChangeName,
    handleChangeStartDate,
    handleChangeEndDate,
    handleChangeNote,
    handleChangeColor,
    // 送信
    isSubmitting,
    submitError,
    handleSubmit: form.handleSubmit,
    handleToggleCompleted: form.handleToggleCompleted,
    // 削除の確認
    isConfirmingDelete,
    openDeleteConfirm: form.openDeleteConfirm,
    closeDeleteConfirm: form.closeDeleteConfirm,
    handleConfirmDelete: form.handleConfirmDelete,
  }
}
