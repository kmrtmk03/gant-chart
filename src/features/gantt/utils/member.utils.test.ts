import { describe, expect, it } from "vitest"

import type { IMember, IProject } from "../gantt.type"
import {
  countCompletedProjects,
  excludeCompletedProjects,
  groupProjectsByMember,
} from "./member.utils"

describe("groupProjectsByMember", () => {
  const createMember = (id: string): IMember => ({
    id,
    name: id,
    sortOrder: 0,
    createdAt: "",
    updatedAt: "",
  })
  const createProject = (
    id: string,
    memberId: string,
    startDate: string,
    endDate: string,
    sortOrder = 0,
  ): IProject => ({
    id,
    memberId,
    name: id,
    startDate,
    endDate,
    color: "blue",
    note: "",
    sortOrder,
    completedAt: null,
    createdAt: "",
    updatedAt: "",
  })

  it("担当者の並びを保ち、案件を sortOrder の昇順に並べる（開始日には関係しない）", () => {
    const groups = groupProjectsByMember(
      [createMember("a"), createMember("b")],
      [
        createProject("p1", "a", "2026-10-10", "2026-10-12", 0),
        createProject("p2", "b", "2026-10-01", "2026-10-02", 0),
        createProject("p3", "a", "2026-10-05", "2026-10-20", 2),
        createProject("p4", "a", "2026-10-01", "2026-10-06", 1),
      ],
    )
    expect(groups.map((group) => group.member.id)).toEqual(["a", "b"])
    expect(groups[0]?.projects.map((project) => project.id)).toEqual([
      "p1",
      "p4",
      "p3",
    ])
    expect(groups[1]?.projects.map((project) => project.id)).toEqual(["p2"])
  })

  it("sortOrder が同じなら開始日順、それも同じなら id 順に並べる", () => {
    const groups = groupProjectsByMember(
      [createMember("a")],
      [
        createProject("p2", "a", "2026-10-05", "2026-10-06", 1),
        createProject("p3", "a", "2026-10-01", "2026-10-02", 1),
        createProject("p1", "a", "2026-10-05", "2026-10-20", 1),
      ],
    )
    expect(groups[0]?.projects.map((project) => project.id)).toEqual([
      "p3",
      "p1",
      "p2",
    ])
  })

  it("案件のない担当者は空配列、担当者のいない案件は無視する", () => {
    const groups = groupProjectsByMember(
      [createMember("a")],
      [createProject("p1", "ghost", "2026-10-01", "2026-10-02")],
    )
    expect(groups).toHaveLength(1)
    expect(groups[0]?.projects).toEqual([])
  })

  it("渡した配列を並び替えて壊さない", () => {
    const projects = [
      createProject("p1", "a", "2026-10-10", "2026-10-12", 1),
      createProject("p2", "a", "2026-10-01", "2026-10-02", 0),
    ]
    groupProjectsByMember([createMember("a")], projects)
    expect(projects.map((project) => project.id)).toEqual(["p1", "p2"])
  })

  it("担当者が 0 人なら空配列", () => {
    expect(groupProjectsByMember([], [])).toEqual([])
  })
})

describe("excludeCompletedProjects / countCompletedProjects", () => {
  const member: IMember = {
    id: "m1",
    name: "田中",
    sortOrder: 0,
    createdAt: "",
    updatedAt: "",
  }
  const createProject = (id: string, completedAt: string | null): IProject => ({
    id,
    memberId: member.id,
    name: id,
    startDate: "2026-10-01",
    endDate: "2026-10-02",
    color: "blue",
    note: "",
    sortOrder: 0,
    completedAt,
    createdAt: "",
    updatedAt: "",
  })
  const open1 = createProject("open-1", null)
  const done = createProject("done", "2026-10-30T09:00:00.000Z")
  const open2 = createProject("open-2", null)

  it("完了済みの案件だけを取り除き、並び順は変えない", () => {
    expect(
      excludeCompletedProjects([{ member, projects: [open1, done, open2] }]),
    ).toEqual([{ member, projects: [open1, open2] }])
  })

  it("案件がすべて完了済みでも、担当者は残す", () => {
    expect(excludeCompletedProjects([{ member, projects: [done] }])).toEqual([
      { member, projects: [] },
    ])
  })

  it("完了済みの件数を数える", () => {
    expect(countCompletedProjects([open1, done, open2])).toBe(1)
    expect(countCompletedProjects([])).toBe(0)
  })
})
