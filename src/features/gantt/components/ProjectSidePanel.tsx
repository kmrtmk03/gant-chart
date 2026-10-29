import { useEffect, useId } from "react"

import { BAR_COLORS } from "../gantt.constants"
import { isBarColor } from "../gantt.guards"
import type {
  IBarColorPreset,
  IMember,
  IProject,
  TBarColor,
  TDateString,
  TProjectInput,
} from "../gantt.type"
import { ConfirmDialog } from "./ConfirmDialog"
import { useProjectForm } from "./hooks/useProjectForm"
import styles from "./ProjectSidePanel.module.scss"

/** 色の選択肢。BAR_COLORS のキーを型ガードで TBarColor に絞って並べる（型アサーションを避けるため） */
const COLOR_OPTIONS = Object.entries(BAR_COLORS).filter(
  (entry): entry is [TBarColor, IBarColorPreset] => isBarColor(entry[0]),
)

interface IProjectSidePanelProps {
  /** 担当者の選択肢（1 人以上） */
  members: IMember[]
  /** 編集する案件。追加のときは null */
  project: IProject | null
  /** 追加のときの担当者の初期選択 */
  defaultMemberId: string | null
  today: TDateString
  /** 保存。失敗したら例外を投げること。成功したら呼び出し側がパネルを閉じる */
  onSubmit: (input: TProjectInput) => Promise<void>
  /** 削除（編集のときだけ使う）。失敗したら例外を投げること */
  onDelete: () => Promise<void>
  onClose: () => void
}

/**
 * 案件を追加・編集する右側のサイドパネル。タイムラインの上に重ねて出し、タイムラインの幅は変えない。
 * 開き直すとき（別の案件・別の担当者）は、呼び出し側で `key` を変えてフォームを作り直すこと。
 * Esc で閉じる（入力途中でも確認しない）。開いた直後は案件名の入力欄にフォーカスする。
 */
export function ProjectSidePanel({
  members,
  project,
  defaultMemberId,
  today,
  onSubmit,
  onDelete,
  onClose,
}: IProjectSidePanelProps) {
  const form = useProjectForm({
    members,
    project,
    defaultMemberId,
    today,
    onSubmit,
    onDelete,
  })
  const { values, errors, isConfirmingDelete } = form
  const isEditing = project !== null
  const idPrefix = useId()

  // Esc で閉じる。削除の確認ダイアログが開いている間は、ダイアログ側の Esc（確認を閉じる）を優先する。
  // 保存・削除の実行中は閉じない（結果を見失わないため）
  useEffect(() => {
    if (isConfirmingDelete || form.isSubmitting) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isConfirmingDelete, form.isSubmitting, onClose])

  return (
    <aside
      className={styles.panel}
      aria-label={isEditing ? "案件を編集" : "案件を追加"}
    >
      <header className={styles.header}>
        <h2 className={styles.title}>
          {isEditing ? "案件を編集" : "案件を追加"}
        </h2>
        <button type="button" aria-label="閉じる" onClick={onClose}>
          ✕
        </button>
      </header>

      <form className={styles.form} noValidate onSubmit={form.handleSubmit}>
        <div className={styles.field}>
          <label htmlFor={`${idPrefix}-member`}>担当者</label>
          <select
            id={`${idPrefix}-member`}
            value={values.memberId}
            aria-invalid={errors.memberId !== undefined}
            onChange={(event) => form.setField("memberId", event.target.value)}
          >
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
          {errors.memberId && <p className={styles.error}>{errors.memberId}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor={`${idPrefix}-name`}>案件名</label>
          <input
            id={`${idPrefix}-name`}
            type="text"
            autoFocus
            value={values.name}
            aria-invalid={errors.name !== undefined}
            onChange={(event) => form.setField("name", event.target.value)}
          />
          {errors.name && <p className={styles.error}>{errors.name}</p>}
        </div>

        <div className={styles.dateRow}>
          <div className={styles.field}>
            <label htmlFor={`${idPrefix}-start`}>開始日</label>
            <input
              id={`${idPrefix}-start`}
              type="date"
              value={values.startDate}
              aria-invalid={errors.startDate !== undefined}
              onChange={(event) =>
                form.setField("startDate", event.target.value)
              }
            />
            {errors.startDate && (
              <p className={styles.error}>{errors.startDate}</p>
            )}
          </div>
          <div className={styles.field}>
            <label htmlFor={`${idPrefix}-end`}>終了日</label>
            <input
              id={`${idPrefix}-end`}
              type="date"
              value={values.endDate}
              aria-invalid={errors.endDate !== undefined}
              onChange={(event) => form.setField("endDate", event.target.value)}
            />
            {errors.endDate && <p className={styles.error}>{errors.endDate}</p>}
          </div>
        </div>

        <fieldset className={styles.colorField}>
          <legend>帯の色</legend>
          <div className={styles.colors}>
            {COLOR_OPTIONS.map(([colorKey, preset]) => (
              <label key={colorKey} className={styles.colorOption}>
                <input
                  type="radio"
                  name={`${idPrefix}-color`}
                  className={styles.colorInput}
                  value={colorKey}
                  checked={values.color === colorKey}
                  onChange={() => form.setField("color", colorKey)}
                />
                {/* 色は動的な値なので背景色だけインラインスタイルで渡す */}
                <span
                  className={styles.colorSwatch}
                  style={{ background: `var(${preset.cssVariable})` }}
                  title={preset.label}
                />
                <span className={styles.srOnly}>{preset.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className={styles.field}>
          <label htmlFor={`${idPrefix}-note`}>メモ</label>
          <textarea
            id={`${idPrefix}-note`}
            rows={4}
            value={values.note}
            onChange={(event) => form.setField("note", event.target.value)}
          />
        </div>

        {form.submitError && (
          <p className={styles.error} role="alert">
            保存できませんでした。{form.submitError.message}
          </p>
        )}

        <div className={styles.actions}>
          {isEditing && (
            <button
              type="button"
              className={styles.deleteButton}
              disabled={form.isSubmitting}
              onClick={form.openDeleteConfirm}
            >
              削除
            </button>
          )}
          <span className={styles.spacer} />
          <button type="button" disabled={form.isSubmitting} onClick={onClose}>
            キャンセル
          </button>
          <button
            type="submit"
            className={styles.saveButton}
            disabled={form.isSubmitting}
          >
            保存
          </button>
        </div>
      </form>

      <ConfirmDialog
        isOpen={isConfirmingDelete}
        title="案件を削除しますか？"
        message={`「${project?.name ?? ""}」を削除します。この操作は元に戻せません。`}
        confirmLabel="削除する"
        isBusy={form.isSubmitting}
        onConfirm={form.handleConfirmDelete}
        onCancel={form.closeDeleteConfirm}
      />
    </aside>
  )
}
