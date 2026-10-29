import type { IMember, TMoveDirection } from "../../gantt.type"
import styles from "./MemberManageRow.module.scss"
import { useMemberManageRow } from "./useMemberManageRow"

interface IMemberManageRowProps {
  member: IMember
  /** 全担当者。名前の重複の警告に使う */
  members: IMember[]
  /** 担当している案件の数 */
  projectCount: number
  /** 一番上か。true の間は「上へ」を押せない */
  isFirst: boolean
  /** 一番下か。true の間は「下へ」を押せない */
  isLast: boolean
  /** 保存中か。true の間は操作できない */
  isBusy: boolean
  /** 名前を保存する。成功したら true、失敗したら false */
  onRename: (memberId: string, name: string) => Promise<boolean>
  onMove: (memberId: string, direction: TMoveDirection) => void
  /** 削除ボタンを押したとき（確認ダイアログは親が出す） */
  onRequestDelete: (memberId: string) => void
}

/**
 * 担当者の管理ダイアログの 1 行。名前の入力欄（その場で編集）・案件数・上へ / 下へ・削除を並べる。
 * 呼び出し側で担当者の `id` を `key` にすること（入力中の下書きを担当者ごとに保つため）。
 * 名前の下書きと検証は `useMemberManageRow` が受け持つ。
 */
export function MemberManageRow({
  member,
  members,
  projectCount,
  isFirst,
  isLast,
  isBusy,
  onRename,
  onMove,
  onRequestDelete,
}: IMemberManageRowProps) {
  const row = useMemberManageRow({ member, members, onRename })

  return (
    <li className={styles.row}>
      <form className={styles.nameForm} onSubmit={row.handleSubmit}>
        <input
          type="text"
          className={styles.nameInput}
          aria-label={`${member.name}の名前`}
          aria-invalid={row.errorMessage !== null}
          disabled={isBusy}
          value={row.draftName}
          onChange={row.handleChangeName}
          onBlur={row.handleBlur}
        />
      </form>
      <span className={styles.count}>{projectCount}件</span>
      <button
        type="button"
        aria-label={`${member.name}を上へ`}
        disabled={isFirst || isBusy}
        onClick={() => onMove(member.id, "up")}
      >
        ↑
      </button>
      <button
        type="button"
        aria-label={`${member.name}を下へ`}
        disabled={isLast || isBusy}
        onClick={() => onMove(member.id, "down")}
      >
        ↓
      </button>
      <button
        type="button"
        className={styles.deleteButton}
        disabled={isBusy}
        onClick={() => onRequestDelete(member.id)}
      >
        削除
      </button>
      {row.errorMessage && (
        <p className={styles.error} role="alert">
          {row.errorMessage}
        </p>
      )}
      {row.warningMessage && (
        <p className={styles.warning}>{row.warningMessage}</p>
      )}
    </li>
  )
}
