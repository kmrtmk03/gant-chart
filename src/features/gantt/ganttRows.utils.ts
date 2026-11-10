import { MEMBER_ROW_HEIGHT, PROJECT_ROW_HEIGHT } from "./gantt.constants"
import type { IProject } from "./gantt.type"
import type { IMemberGroup } from "./gantt.utils"

/**
 * 左リストとタイムラインが共有する「行モデル」。
 * 担当者 1 人ぶんの行の種別・順序・開閉・高さを、このファイルの 1 か所だけで決める。
 * 左右のコンポーネントは `buildMemberRowGroups` の結果をそのまま種別ごとに描くだけにして、
 * 折りたたみの条件や行の並びを別々に組み立てないこと（片側だけ直すと左右の行がずれるため）。
 * 行の種別を増やすときは、`TGanttRow` に足し、`getRowHeight` と左右の描画の `switch` を直す
 * （`switch` は網羅チェックで、足し忘れると型エラーになる）。
 */

/** 行の種別 */
export type TGanttRowKind = "member" | "project" | "addProject"

/** 担当者行 */
export interface IMemberRow {
  kind: "member"
  key: string
}

/** 案件行（左リストでは案件名、タイムラインでは帯を出す） */
export interface IProjectRow {
  kind: "project"
  key: string
  project: IProject
}

/** 「案件を追加」行（左リストではボタン、タイムラインでは高さをそろえるための空行） */
export interface IAddProjectRow {
  kind: "addProject"
  key: string
}

/** 1 行ぶんのモデル。`kind` で判別する */
export type TGanttRow = IMemberRow | IProjectRow | IAddProjectRow

/** 担当者 1 人ぶんの行のまとまり */
export interface IMemberRowGroup {
  memberId: string
  /** 担当者と、その配下の案件（担当者行の件数・まとめ帯に使う。折りたたみ中でも使う） */
  memberGroup: IMemberGroup
  /** 開いているか。false の間は案件行と「案件を追加」行を含まない */
  isExpanded: boolean
  /** 描く行（担当者行 → 開いていれば案件行 → 「案件を追加」行）の順 */
  rows: TGanttRow[]
}

/**
 * 行の高さ（px）を返す。左リストとタイムラインで必ずこの関数を使い、行をそろえる。
 * 「案件を追加」行は案件行と同じ高さ。
 */
export function getRowHeight(kind: TGanttRowKind): number {
  switch (kind) {
    case "member":
      return MEMBER_ROW_HEIGHT
    case "project":
    case "addProject":
      return PROJECT_ROW_HEIGHT
  }
}

/**
 * 担当者ごとの行のまとまりを作る。開いているか（`!collapsedMemberIds.has(id)`）の判定と、
 * 行の並びは、左リストとタイムラインの両方でここから受け取ること。
 */
export function buildMemberRowGroups(
  memberGroups: IMemberGroup[],
  collapsedMemberIds: ReadonlySet<string>,
): IMemberRowGroup[] {
  return memberGroups.map((memberGroup) => {
    const memberId = memberGroup.member.id
    const isExpanded = !collapsedMemberIds.has(memberId)

    const rows: TGanttRow[] = [{ kind: "member", key: `member:${memberId}` }]
    if (isExpanded) {
      for (const project of memberGroup.projects) {
        rows.push({ kind: "project", key: project.id, project })
      }
      rows.push({ kind: "addProject", key: `add:${memberId}` })
    }

    return { memberId, memberGroup, isExpanded, rows }
  })
}

/**
 * 案件行の並びだけを `orderedProjectIds` の順に差し替える（担当者行・「案件を追加」行の位置は変えない）。
 * 左リストのドラッグ中・保存中の並びを描くために使う（タイムラインは保存後まで元の並びのまま）。
 * `orderedProjectIds` に含まれない案件行は、元の並びのまま末尾側に残す（手元の一覧と食い違ったときの防御）。
 */
export function applyProjectOrder(
  rows: TGanttRow[],
  orderedProjectIds: string[],
): TGanttRow[] {
  const projectRowById = new Map<string, IProjectRow>()
  for (const row of rows) {
    if (row.kind === "project") projectRowById.set(row.project.id, row)
  }

  // 指定された順に取り出し、取り出せなかった（指定にない）案件行は元の順で後ろにつなぐ
  const ordered: IProjectRow[] = []
  for (const id of orderedProjectIds) {
    const row = projectRowById.get(id)
    if (row === undefined) continue
    ordered.push(row)
    projectRowById.delete(id)
  }
  ordered.push(...projectRowById.values())

  // 案件行のあった位置に、並べ替えた案件行を順に入れ直す（件数は同じなので、取り出せなければ元の行のまま）
  let nextProjectIndex = 0
  return rows.map((row) =>
    row.kind === "project" ? (ordered[nextProjectIndex++] ?? row) : row,
  )
}
