import { isDateString, isMember, isProject } from "../gantt.guards"
import type { IMember, IProject } from "../gantt.type"
import {
  GanttNotFoundError,
  GanttValidationError,
} from "./ganttRepository.errors"

/**
 * repository の実装（localStorage 版・Firestore 版）が共有する業務ルールの純粋関数。
 *
 * MEMO: クライアントとサーバーの両方から読み込まれるため、`firebase-admin` や `window` など
 * 実行環境に依存するコードを入れないこと。値は引数で受け取り、結果を返すだけにする
 */

/** 現在日時を ISO 8601 の文字列で返す（createdAt / updatedAt 用） */
export function getCurrentDateTime(): string {
  return new Date().toISOString()
}

/**
 * 更新後の完了日時を決める。
 * - `isCompleted` が省略されたら今のまま
 * - true: 未完了なら今の日時を入れる。すでに完了していれば、最初に完了にした日時を変えない
 * - false: 未完了（null）に戻す
 */
export function resolveCompletedAt(
  current: string | null,
  isCompleted: boolean | undefined,
  timestamp: string,
): string | null {
  if (isCompleted === undefined) return current
  if (!isCompleted) return null
  return current ?? timestamp
}

/**
 * 一番下に足すときの sortOrder（渡した一覧の最大値 + 1。空なら 0）を返す。
 * 担当者は全員を、案件は追加先の担当者の案件だけを渡す
 */
export function getNextSortOrder(items: { sortOrder: number }[]): number {
  return items.reduce((max, item) => Math.max(max, item.sortOrder + 1), 0)
}

/** 指定した担当者の案件だけを取り出す */
export function filterProjectsOfMember(
  projects: IProject[],
  memberId: string,
): IProject[] {
  return projects.filter((project) => project.memberId === memberId)
}

/** 担当者を保存してよいか確かめる。不正なら GanttValidationError を投げる */
export function validateMember(member: IMember): void {
  if (!isMember(member)) {
    throw new GanttValidationError("担当者の入力が不正です")
  }
}

/**
 * 案件を保存してよいか確かめる。不正なら GanttValidationError を投げる。
 * 画面に出しやすいよう、よくある誤り（日付）は個別のメッセージにしてから、残りを型ガードでまとめて確かめる。
 */
export function validateProject(project: IProject): void {
  if (!isDateString(project.startDate) || !isDateString(project.endDate)) {
    throw new GanttValidationError(
      `日付は実在する "YYYY-MM-DD" 形式で指定してください（開始日: ${project.startDate}、終了日: ${project.endDate}）`,
    )
  }
  if (project.startDate > project.endDate) {
    throw new GanttValidationError("開始日は終了日以前の日付にしてください")
  }
  if (!isProject(project)) {
    throw new GanttValidationError("案件の入力が不正です")
  }
}

/**
 * 担当者の並び替えの結果を作る。保存はしない。
 * 渡された順に sortOrder を 0 から振り直し、`orderedIds` の順に並べた全担当者を返す。
 * 順番が変わらない担当者は updatedAt も変えず、元のオブジェクトをそのまま返す
 * （呼び出し側は `result[i] !== members[...]` ではなく、sortOrder の変化で書き込み対象を判断してよい）。
 *
 * @param members 現在の全担当者
 * @param orderedIds 並び替え後の全担当者の id
 * @param timestamp 順番が変わった担当者に入れる updatedAt
 * @throws GanttValidationError id が重複している、または全担当者の id が揃っていない
 * @throws GanttNotFoundError 存在しない id が含まれている
 */
export function buildReorderedMembers(
  members: IMember[],
  orderedIds: string[],
  timestamp: string,
): IMember[] {
  const memberById = new Map(members.map((member) => [member.id, member]))

  if (new Set(orderedIds).size !== orderedIds.length) {
    throw new GanttValidationError("並び替えの id が重複しています")
  }

  const reordered = orderedIds.map((id, index) => {
    const member = memberById.get(id)
    if (member === undefined) throw new GanttNotFoundError("member", id)
    if (member.sortOrder === index) return member
    return { ...member, sortOrder: index, updatedAt: timestamp }
  })

  // 重複も未知の id もないので、件数が同じなら全員がちょうど 1 回ずつ含まれている
  if (reordered.length !== members.length) {
    throw new GanttValidationError(
      "並び替えには、すべての担当者の id を指定してください",
    )
  }

  return reordered
}

/**
 * 1 人の担当者の案件の並び替えの結果を作る。保存はしない。
 * 渡された順に sortOrder を 0 から振り直し、`orderedIds` の順に並べた案件を返す。
 * 順番が変わらない案件は updatedAt も変えず、元のオブジェクトをそのまま返す。
 *
 * @param projectsOfMember 対象の担当者の全案件（`filterProjectsOfMember` で絞ったもの）
 * @param orderedIds 並び替え後のその担当者の全案件の id
 * @param timestamp 順番が変わった案件に入れる updatedAt
 * @throws GanttValidationError id が重複している、別の担当者の案件・存在しない id が含まれている、
 *   またはその担当者の全案件の id が揃っていない
 */
export function buildReorderedProjects(
  projectsOfMember: IProject[],
  orderedIds: string[],
  timestamp: string,
): IProject[] {
  // 並び替えの対象は指定した担当者の案件だけ。別の担当者の案件の id は「存在しない」として扱う
  const projectById = new Map(
    projectsOfMember.map((project) => [project.id, project]),
  )

  if (new Set(orderedIds).size !== orderedIds.length) {
    throw new GanttValidationError("並び替えの id が重複しています")
  }

  const reordered = orderedIds.map((id, index) => {
    const project = projectById.get(id)
    if (project === undefined) {
      throw new GanttValidationError(
        `並び替えの id に、この担当者の案件ではない id が含まれています（${id}）`,
      )
    }
    if (project.sortOrder === index) return project
    return { ...project, sortOrder: index, updatedAt: timestamp }
  })

  // 重複も余計な id もないので、件数が同じならその担当者の案件がちょうど 1 回ずつ含まれている
  if (reordered.length !== projectById.size) {
    throw new GanttValidationError(
      "並び替えには、その担当者のすべての案件の id を指定してください",
    )
  }

  return reordered
}
