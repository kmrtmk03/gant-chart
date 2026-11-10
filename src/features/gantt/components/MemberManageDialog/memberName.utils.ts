import { MEMBER_NAME_MAX_LENGTH } from "../../gantt.constants"
import type { IMember } from "../../gantt.type"

// 担当者名の検証。担当者の管理ダイアログ（MemberManageDialog）と、その 1 行（MemberManageRow）だけが使う。
// MEMO: MemberManageRow からはバレル（index.ts）ではなくこのファイルを直接 import する
// （バレル経由だと Dialog → Row → Dialog の循環になるため）。

/**
 * 担当者名を検証し、問題があればエラーメッセージ、なければ null を返す。
 * repository は名前の中身を見ないため、必須・文字数のチェックは画面側（これ）が唯一の砦になる。
 * 前後の空白は除いて判定するので、呼び出し側も保存する値は `trim()` したものにすること。
 * MEMO: 文字数は UTF-16 のコード単位（`length`）で数える。絵文字などは 2 文字ぶんになるが、身内利用なので許容している
 * （案件名の検証 `validateProjectForm` も同じ数え方）。
 */
export function validateMemberName(name: string): string | null {
  const trimmed = name.trim()
  if (trimmed === "") return "担当者名を入力してください"
  if (trimmed.length > MEMBER_NAME_MAX_LENGTH) {
    return `担当者名は ${MEMBER_NAME_MAX_LENGTH} 文字以内で入力してください`
  }
  return null
}

/**
 * 同じ名前の担当者がすでにいるか。同姓の人がいる場合を考えて登録は許すため、警告の表示にだけ使う。
 * `excludeMemberId` に名前変更中の担当者を渡すと、自分自身は数えない。前後の空白は除いて比べる。
 */
export function hasSameNameMember(
  name: string,
  members: IMember[],
  excludeMemberId: string | null = null,
): boolean {
  const trimmed = name.trim()
  if (trimmed === "") return false
  return members.some(
    (member) => member.id !== excludeMemberId && member.name === trimmed,
  )
}
