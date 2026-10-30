import type { IMemberGroup } from "../../gantt.utils"
import { ConfirmDialog } from "../ConfirmDialog"
import { MemberManageRow } from "../MemberManageRow"
import styles from "./MemberManageDialog.module.scss"
import { useMemberManageDialog } from "./useMemberManageDialog"

interface IMemberManageDialogProps {
  /** 担当者（表示順）と配下の案件。案件の数の表示と、削除の確認に使う */
  memberGroups: IMemberGroup[]
  /** 追加。名前は検証・trim 済みで渡る。失敗したら例外を投げること */
  onCreate: (name: string) => Promise<void>
  /** 名前変更。名前は検証・trim 済みで渡る。失敗したら例外を投げること */
  onRename: (memberId: string, name: string) => Promise<void>
  /** 並べ替え後の全担当者の id の並びを保存する。失敗したら例外を投げること */
  onReorder: (orderedIds: string[]) => Promise<void>
  /** 削除（配下の案件も消える）。失敗したら例外を投げること */
  onDelete: (memberId: string) => Promise<void>
  onClose: () => void
}

/**
 * 担当者の追加・名前変更・並び替え・削除を行うダイアログ（`<dialog>` を showModal で開く）。
 * 呼び出し側は、開いている間だけこのコンポーネントを置くこと（外すと閉じ、入力中の値も破棄される）。
 * 並び替えは、行の左端のつかみのドラッグで行う。
 * 削除は確認ダイアログ（`ConfirmDialog`）を挟み、案件を持つ担当者は一緒に消える件数を出す。
 * 開閉・保存の実行は `useMemberManageDialog` が受け持つ。
 */
export function MemberManageDialog({
  memberGroups,
  onCreate,
  onRename,
  onReorder,
  onDelete,
  onClose,
}: IMemberManageDialogProps) {
  // 戻り値は分割代入して使う。ref を含むオブジェクトのプロパティ参照を、
  // lint の react-hooks/refs が「描画中の ref 参照」と誤検知するため（ConfirmDialog と同じ）
  const {
    dialogRef,
    titleId,
    handleCancel,
    members,
    rows,
    isBusy,
    actionErrorMessage,
    handleRename,
    registerRow,
    handleHandlePointerDown,
    handleLostPointerCapture,
    newName,
    newNameError,
    newNameWarning,
    handleChangeNewName,
    handleSubmitNew,
    isConfirmingDelete,
    deleteConfirmMessage,
    requestDelete,
    cancelDelete,
    confirmDelete,
  } = useMemberManageDialog({
    memberGroups,
    onCreate,
    onRename,
    onReorder,
    onDelete,
    onClose,
  })

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      onCancel={handleCancel}
    >
      <header className={styles.header}>
        <h2 id={titleId} className={styles.title}>
          担当者を管理
        </h2>
        <button
          type="button"
          aria-label="閉じる"
          disabled={isBusy}
          onClick={onClose}
        >
          ✕
        </button>
      </header>

      {rows.length === 0 ? (
        <p className={styles.empty}>担当者がいません</p>
      ) : (
        <ul className={styles.list}>
          {rows.map((row) => (
            <MemberManageRow
              key={row.member.id}
              member={row.member}
              members={members}
              projectCount={row.projectCount}
              dragState={row.dragState}
              isBusy={isBusy}
              registerRow={registerRow}
              onRename={handleRename}
              onHandlePointerDown={handleHandlePointerDown}
              onHandleLostPointerCapture={handleLostPointerCapture}
              onRequestDelete={requestDelete}
            />
          ))}
        </ul>
      )}

      {actionErrorMessage && (
        <p className={styles.error} role="alert">
          保存できませんでした。{actionErrorMessage}
        </p>
      )}

      <form className={styles.addForm} onSubmit={handleSubmitNew}>
        <input
          type="text"
          className={styles.addInput}
          placeholder="新しい担当者の名前"
          aria-label="新しい担当者の名前"
          aria-invalid={newNameError !== null}
          disabled={isBusy}
          value={newName}
          onChange={handleChangeNewName}
        />
        <button type="submit" className={styles.addButton} disabled={isBusy}>
          追加
        </button>
        {newNameError && (
          <p className={styles.error} role="alert">
            {newNameError}
          </p>
        )}
        {newNameWarning && <p className={styles.warning}>{newNameWarning}</p>}
      </form>

      <ConfirmDialog
        isOpen={isConfirmingDelete}
        title="担当者を削除しますか？"
        message={deleteConfirmMessage}
        confirmLabel="削除する"
        isBusy={isBusy}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </dialog>
  )
}
