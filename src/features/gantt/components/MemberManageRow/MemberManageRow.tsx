import type { PointerEvent as ReactPointerEvent } from "react"

import type { IMember } from "../../gantt.type"
import type { IDragReorderRowState } from "../../hooks/useDragReorder"
import { DragHandle } from "../DragHandle"
import styles from "./MemberManageRow.module.scss"
import { useMemberManageRow } from "./useMemberManageRow"

interface IMemberManageRowProps {
  member: IMember
  /** 全担当者。名前の重複の警告に使う */
  members: IMember[]
  /** 担当している案件の数 */
  projectCount: number
  /** この行のドラッグの状態（浮かせる量・挿入位置の線） */
  dragState: IDragReorderRowState
  /** 保存中か。true の間は操作できない */
  isBusy: boolean
  /** 行の要素を並び替えのフックに登録する（null で登録を外す） */
  registerRow: (memberId: string, element: HTMLElement | null) => void
  /** 名前を保存する。成功したら true、失敗したら false */
  onRename: (memberId: string, name: string) => Promise<boolean>
  /** つかみの pointerdown。行の担当者 ID とイベントを渡す */
  onHandlePointerDown: (
    memberId: string,
    event: ReactPointerEvent<Element>,
  ) => void
  onHandleLostPointerCapture: () => void
  /** 削除ボタンを押したとき（確認ダイアログは親が出す） */
  onRequestDelete: (memberId: string) => void
}

/**
 * 担当者の管理ダイアログの 1 行。並び替えのつかみ・名前の入力欄（その場で編集）・案件数・削除を並べる。
 * 呼び出し側で担当者の `id` を `key` にすること（入力中の下書きを担当者ごとに保つため）。
 * 名前の下書きと検証、行の見た目の値は `useMemberManageRow` が受け持つ。
 */
export function MemberManageRow({
  member,
  members,
  projectCount,
  dragState,
  isBusy,
  registerRow,
  onRename,
  onHandlePointerDown,
  onHandleLostPointerCapture,
  onRequestDelete,
}: IMemberManageRowProps) {
  // 戻り値は分割代入して使う。ref のコールバック（rowRef）を含むオブジェクトのプロパティ参照を、
  // lint の react-hooks/refs が「描画中の ref 参照」と誤検知するため（ConfirmDialog と同じ対処）
  const {
    rowRef,
    rowClassName,
    rowStyle,
    handleLabel,
    draftName,
    errorMessage,
    warningMessage,
    handleChangeName,
    handleSubmit,
    handleBlur,
  } = useMemberManageRow({
    member,
    members,
    dragState,
    registerRow,
    onRename,
  })

  return (
    <li ref={rowRef} className={rowClassName} style={rowStyle}>
      <DragHandle
        label={handleLabel}
        isDragging={dragState.isDragging}
        isDisabled={isBusy}
        onPointerDown={(event) => onHandlePointerDown(member.id, event)}
        onLostPointerCapture={onHandleLostPointerCapture}
      />
      <form className={styles.nameForm} onSubmit={handleSubmit}>
        <input
          type="text"
          className={styles.nameInput}
          aria-label={`${member.name}の名前`}
          aria-invalid={errorMessage !== null}
          disabled={isBusy}
          value={draftName}
          onChange={handleChangeName}
          onBlur={handleBlur}
        />
      </form>
      <span className={styles.count}>{projectCount}件</span>
      <button
        type="button"
        className={styles.deleteButton}
        disabled={isBusy}
        onClick={() => onRequestDelete(member.id)}
      >
        削除
      </button>
      {errorMessage && (
        <p className={styles.error} role="alert">
          {errorMessage}
        </p>
      )}
      {warningMessage && <p className={styles.warning}>{warningMessage}</p>}
    </li>
  )
}
