import type {
  IMember,
  IProject,
  TDateString,
  TProjectInput,
} from "../../gantt.type"
import { ConfirmDialog } from "../ConfirmDialog"
import styles from "./ProjectSidePanel.module.scss"
import { useProjectSidePanel } from "./useProjectSidePanel"

interface IProjectSidePanelProps {
  /** 担当者の選択肢（1 人以上） */
  members: IMember[]
  /** 編集する案件。追加のときは null */
  project: IProject | null
  /** 追加のときの担当者の初期選択 */
  defaultMemberId: string | null
  today: TDateString
  /**
   * 保存。失敗したら例外を投げること。成功したら呼び出し側がパネルを閉じる。
   * 「完了にする / 未完了に戻す」で保存するときだけ `isCompleted` を渡す（省略は完了の状態を変えない）
   */
  onSubmit: (input: TProjectInput, isCompleted?: boolean) => Promise<void>
  /** 削除（編集のときだけ使う）。失敗したら例外を投げること */
  onDelete: () => Promise<void>
  onClose: () => void
}

/**
 * 案件を追加・編集する右側のサイドパネル。タイムラインの上に重ねて出し、タイムラインの幅は変えない。
 * 開き直すとき（別の案件・別の担当者）は、呼び出し側で `key` を変えてフォームを作り直すこと。
 * Esc で閉じる（入力途中でも確認しない）。開いた直後は案件名の入力欄にフォーカスする。
 * 編集のときは「完了にする / 未完了に戻す」も出す（フォームの内容と一緒に保存する）。
 * フォームの状態や Esc の扱いは `useProjectSidePanel` が受け持つ。
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
  const panel = useProjectSidePanel({
    members,
    project,
    defaultMemberId,
    today,
    onSubmit,
    onDelete,
    onClose,
  })
  const { values, errors, fieldIds } = panel

  return (
    <aside className={styles.panel} aria-label={panel.title}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <h2 className={styles.title}>{panel.title}</h2>
          {panel.completedLabel && (
            <span className={styles.completedBadge}>
              {panel.completedLabel}
            </span>
          )}
        </div>
        <button type="button" aria-label="閉じる" onClick={onClose}>
          ✕
        </button>
      </header>

      <form className={styles.form} noValidate onSubmit={panel.handleSubmit}>
        <div className={styles.field}>
          <label htmlFor={fieldIds.member}>担当者</label>
          <select
            id={fieldIds.member}
            value={values.memberId}
            aria-invalid={errors.memberId !== undefined}
            onChange={panel.handleChangeMember}
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
          <label htmlFor={fieldIds.name}>案件名</label>
          <input
            id={fieldIds.name}
            type="text"
            autoFocus
            value={values.name}
            aria-invalid={errors.name !== undefined}
            onChange={panel.handleChangeName}
          />
          {errors.name && <p className={styles.error}>{errors.name}</p>}
        </div>

        <div className={styles.dateRow}>
          <div className={styles.field}>
            <label htmlFor={fieldIds.startDate}>開始日</label>
            <input
              id={fieldIds.startDate}
              type="date"
              value={values.startDate}
              aria-invalid={errors.startDate !== undefined}
              onChange={panel.handleChangeStartDate}
            />
            {errors.startDate && (
              <p className={styles.error}>{errors.startDate}</p>
            )}
          </div>
          <div className={styles.field}>
            <label htmlFor={fieldIds.endDate}>終了日</label>
            <input
              id={fieldIds.endDate}
              type="date"
              value={values.endDate}
              aria-invalid={errors.endDate !== undefined}
              onChange={panel.handleChangeEndDate}
            />
            {errors.endDate && <p className={styles.error}>{errors.endDate}</p>}
          </div>
        </div>

        <fieldset className={styles.colorField}>
          <legend>帯の色</legend>
          <div className={styles.colors}>
            {panel.colorOptions.map((option) => (
              <label key={option.key} className={styles.colorOption}>
                <input
                  type="radio"
                  name={fieldIds.color}
                  className={styles.colorInput}
                  value={option.key}
                  checked={option.isChecked}
                  onChange={() => panel.handleChangeColor(option.key)}
                />
                <span
                  className={styles.colorSwatch}
                  style={option.swatchStyle}
                  title={option.label}
                />
                <span className={styles.srOnly}>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className={styles.field}>
          <label htmlFor={fieldIds.note}>メモ</label>
          <textarea
            id={fieldIds.note}
            rows={4}
            value={values.note}
            onChange={panel.handleChangeNote}
          />
        </div>

        {panel.submitError && (
          <p className={styles.error} role="alert">
            保存できませんでした。{panel.submitError.message}
          </p>
        )}

        <div className={styles.actions}>
          {panel.isEditing && (
            <button
              type="button"
              className={styles.completeButton}
              disabled={panel.isSubmitting}
              onClick={panel.handleToggleCompleted}
            >
              {panel.completeButtonLabel}
            </button>
          )}
          {panel.isEditing && (
            <button
              type="button"
              className={styles.deleteButton}
              disabled={panel.isSubmitting}
              onClick={panel.openDeleteConfirm}
            >
              削除
            </button>
          )}
          <span className={styles.spacer} />
          <button type="button" disabled={panel.isSubmitting} onClick={onClose}>
            キャンセル
          </button>
          <button
            type="submit"
            className={styles.saveButton}
            disabled={panel.isSubmitting}
          >
            保存
          </button>
        </div>
      </form>

      <ConfirmDialog
        isOpen={panel.isConfirmingDelete}
        title="案件を削除しますか？"
        message={panel.deleteConfirmMessage}
        confirmLabel="削除する"
        isBusy={panel.isSubmitting}
        onConfirm={panel.handleConfirmDelete}
        onCancel={panel.closeDeleteConfirm}
      />
    </aside>
  )
}
