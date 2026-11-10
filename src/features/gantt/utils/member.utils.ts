import type { IMember, IProject } from "../gantt.type"

// 担当者と案件のまとまり（左リスト・タイムラインが同じ並びで描くための組み立て）と、完了済みの絞り込み・集計。

/** 担当者と、その配下の案件のまとまり。左リストとタイムラインが同じ並びで描くために使う */
export interface IMemberGroup {
  member: IMember
  /** 表示順（sortOrder の昇順。同じなら開始日順 → id 順）に並んだ案件 */
  projects: IProject[]
}

/**
 * 担当者ごとに案件をまとめる。担当者の並びは渡した順のまま、案件は表示順（sortOrder の昇順）に並べる。
 * sortOrder が同じ案件（別のタブで同時に追加したときなど）は、開始日順 → id 順にして並びを 1 つに決める。
 * 担当者が見つからない案件（memberId が不正）は、どの担当者にも属さないので含めない。
 */
export function groupProjectsByMember(
  members: IMember[],
  projects: IProject[],
): IMemberGroup[] {
  return members.map((member) => ({
    member,
    projects: projects
      .filter((project) => project.memberId === member.id)
      .sort(
        (a, b) =>
          a.sortOrder - b.sortOrder ||
          a.startDate.localeCompare(b.startDate) ||
          a.id.localeCompare(b.id),
      ),
  }))
}

/**
 * 担当者ごとのまとまりから、完了済みの案件を取り除く（「完了済みを表示しない」ときの絞り込み）。
 * 担当者は残す（案件が 0 件になっても担当者行は出す）。並び順は変えない
 */
export function excludeCompletedProjects(
  memberGroups: IMemberGroup[],
): IMemberGroup[] {
  return memberGroups.map((group) => ({
    ...group,
    projects: group.projects.filter((project) => project.completedAt === null),
  }))
}

/** 完了済みの案件の件数を数える（切り替えボタンに添える件数） */
export function countCompletedProjects(projects: IProject[]): number {
  return projects.filter((project) => project.completedAt !== null).length
}
