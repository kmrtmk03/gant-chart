import { describe, expect, it } from "vitest"

import { MEMBER_ROW_HEIGHT, PROJECT_ROW_HEIGHT } from "./gantt.constants"
import type { IMember, IProject } from "./gantt.type"
import type { IMemberGroup } from "./utils/member.utils"
import {
  applyProjectOrder,
  buildMemberRowGroups,
  getRowHeight,
} from "./ganttRows.utils"

const createMember = (id: string): IMember => ({
  id,
  name: id,
  sortOrder: 0,
  createdAt: "",
  updatedAt: "",
})

const createProject = (id: string, memberId: string): IProject => ({
  id,
  memberId,
  name: id,
  startDate: "2026-10-01",
  endDate: "2026-10-02",
  color: "blue",
  note: "",
  sortOrder: 0,
  completedAt: null,
  createdAt: "",
  updatedAt: "",
})

const createGroup = (memberId: string, projectIds: string[]): IMemberGroup => ({
  member: createMember(memberId),
  projects: projectIds.map((id) => createProject(id, memberId)),
})

describe("getRowHeight", () => {
  it("担当者行と案件行の高さを定数どおりに返し、「案件を追加」行は案件行と同じ高さにする", () => {
    expect(getRowHeight("member")).toBe(MEMBER_ROW_HEIGHT)
    expect(getRowHeight("project")).toBe(PROJECT_ROW_HEIGHT)
    expect(getRowHeight("addProject")).toBe(PROJECT_ROW_HEIGHT)
  })
})

describe("buildMemberRowGroups", () => {
  it("開いている担当者は、担当者行 → 案件行（表示順）→「案件を追加」行の順に並べる", () => {
    const [group] = buildMemberRowGroups(
      [createGroup("a", ["p1", "p2"])],
      new Set(),
    )
    expect(group?.isExpanded).toBe(true)
    expect(group?.rows.map((row) => row.kind)).toEqual([
      "member",
      "project",
      "project",
      "addProject",
    ])
    expect(group?.rows.map((row) => row.key)).toEqual([
      "member:a",
      "p1",
      "p2",
      "add:a",
    ])
  })

  it("折りたたみ中の担当者は担当者行だけにするが、担当者と案件の情報は残す", () => {
    const [group] = buildMemberRowGroups(
      [createGroup("a", ["p1"])],
      new Set(["a"]),
    )
    expect(group?.isExpanded).toBe(false)
    expect(group?.rows.map((row) => row.kind)).toEqual(["member"])
    // まとめ帯・件数の表示は折りたたみ中でも案件を使う
    expect(group?.memberGroup.projects).toHaveLength(1)
  })

  it("案件が 0 件の開いている担当者は、担当者行と「案件を追加」行だけにする", () => {
    const [group] = buildMemberRowGroups([createGroup("a", [])], new Set())
    expect(group?.rows.map((row) => row.kind)).toEqual(["member", "addProject"])
  })

  it("担当者の並びを保ち、折りたたみは担当者ごとに判定する", () => {
    const groups = buildMemberRowGroups(
      [createGroup("a", ["p1"]), createGroup("b", ["p2"])],
      new Set(["b"]),
    )
    expect(groups.map((group) => group.memberId)).toEqual(["a", "b"])
    expect(groups.map((group) => group.isExpanded)).toEqual([true, false])
  })

  it("担当者がいなければ空の配列を返す", () => {
    expect(buildMemberRowGroups([], new Set())).toEqual([])
  })
})

describe("applyProjectOrder", () => {
  const rows = () =>
    buildMemberRowGroups([createGroup("a", ["p1", "p2", "p3"])], new Set())[0]
      ?.rows ?? []

  it("案件行だけを指定の順に並べ替え、担当者行と「案件を追加」行の位置は変えない", () => {
    const result = applyProjectOrder(rows(), ["p3", "p1", "p2"])
    expect(result.map((row) => row.key)).toEqual([
      "member:a",
      "p3",
      "p1",
      "p2",
      "add:a",
    ])
  })

  it("元の並びと同じ指定なら、並びを変えない", () => {
    const result = applyProjectOrder(rows(), ["p1", "p2", "p3"])
    expect(result.map((row) => row.key)).toEqual(rows().map((row) => row.key))
  })

  it("指定にない案件行は、元の順で後ろに残し、案件行を落とさない", () => {
    const result = applyProjectOrder(rows(), ["p3"])
    expect(result.map((row) => row.key)).toEqual([
      "member:a",
      "p3",
      "p1",
      "p2",
      "add:a",
    ])
  })

  it("行にない id は無視する", () => {
    const result = applyProjectOrder(rows(), ["x", "p2", "p1", "p3"])
    expect(result.map((row) => row.key)).toEqual([
      "member:a",
      "p2",
      "p1",
      "p3",
      "add:a",
    ])
  })

  it("元の配列を書き換えない", () => {
    const original = rows()
    const keysBefore = original.map((row) => row.key)
    applyProjectOrder(original, ["p3", "p2", "p1"])
    expect(original.map((row) => row.key)).toEqual(keysBefore)
  })
})
