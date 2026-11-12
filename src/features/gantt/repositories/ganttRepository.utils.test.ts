import { describe, expect, it } from "vitest"

import type { IMember, IProject } from "../gantt.type"
import {
  GanttNotFoundError,
  GanttValidationError,
} from "./ganttRepository.errors"
import {
  buildReorderedMembers,
  buildReorderedProjects,
  filterProjectsOfMember,
  getCurrentDateTime,
  getNextSortOrder,
  resolveCompletedAt,
  validateMember,
  validateProject,
} from "./ganttRepository.utils"

const OLD_TIMESTAMP = "2026-10-29T00:00:00.000Z"
const NEW_TIMESTAMP = "2026-10-30T09:00:00.000Z"

/** テスト用の担当者。指定しない項目は固定値 */
function buildMember(id: string, sortOrder: number): IMember {
  return {
    id,
    name: `担当者${id}`,
    sortOrder,
    createdAt: OLD_TIMESTAMP,
    updatedAt: OLD_TIMESTAMP,
  }
}

/** テスト用の案件。指定しない項目は固定値 */
function buildProject(
  id: string,
  memberId: string,
  sortOrder: number,
): IProject {
  return {
    id,
    memberId,
    name: `案件${id}`,
    startDate: "2026-10-01",
    endDate: "2026-10-31",
    color: "blue",
    note: "",
    sortOrder,
    completedAt: null,
    createdAt: OLD_TIMESTAMP,
    updatedAt: OLD_TIMESTAMP,
  }
}

describe("getCurrentDateTime", () => {
  it("ISO 8601 の文字列を返す", () => {
    const value = getCurrentDateTime()
    expect(new Date(value).toISOString()).toBe(value)
  })
})

describe("resolveCompletedAt", () => {
  it("isCompleted が省略されたら今のままにする", () => {
    expect(resolveCompletedAt(null, undefined, NEW_TIMESTAMP)).toBeNull()
    expect(resolveCompletedAt(OLD_TIMESTAMP, undefined, NEW_TIMESTAMP)).toBe(
      OLD_TIMESTAMP,
    )
  })

  it("true で未完了なら今の日時を入れる", () => {
    expect(resolveCompletedAt(null, true, NEW_TIMESTAMP)).toBe(NEW_TIMESTAMP)
  })

  it("true ですでに完了していれば最初の日時を変えない", () => {
    expect(resolveCompletedAt(OLD_TIMESTAMP, true, NEW_TIMESTAMP)).toBe(
      OLD_TIMESTAMP,
    )
  })

  it("false で未完了（null）に戻す", () => {
    expect(resolveCompletedAt(OLD_TIMESTAMP, false, NEW_TIMESTAMP)).toBeNull()
    expect(resolveCompletedAt(null, false, NEW_TIMESTAMP)).toBeNull()
  })
})

describe("getNextSortOrder", () => {
  it("空なら 0 を返す", () => {
    expect(getNextSortOrder([])).toBe(0)
  })

  it("最大値 + 1 を返す（飛び番があっても最大値を基準にする）", () => {
    expect(getNextSortOrder([{ sortOrder: 0 }, { sortOrder: 5 }])).toBe(6)
  })
})

describe("filterProjectsOfMember", () => {
  it("指定した担当者の案件だけを取り出す", () => {
    const projects = [
      buildProject("p1", "m1", 0),
      buildProject("p2", "m2", 0),
      buildProject("p3", "m1", 1),
    ]
    expect(
      filterProjectsOfMember(projects, "m1").map((project) => project.id),
    ).toEqual(["p1", "p3"])
  })

  it("該当がなければ空配列を返す", () => {
    expect(filterProjectsOfMember([buildProject("p1", "m1", 0)], "m9")).toEqual(
      [],
    )
  })
})

describe("validateMember", () => {
  it("正しい担当者は通す", () => {
    expect(() => validateMember(buildMember("m1", 0))).not.toThrow()
  })

  it("形が不正なら GanttValidationError を投げる", () => {
    const invalid = { ...buildMember("m1", 0), sortOrder: Number.NaN }
    expect(() => validateMember(invalid)).toThrow(GanttValidationError)
  })
})

describe("validateProject", () => {
  it("正しい案件は通す", () => {
    expect(() => validateProject(buildProject("p1", "m1", 0))).not.toThrow()
  })

  it("実在しない日付は GanttValidationError を投げる", () => {
    const invalid = { ...buildProject("p1", "m1", 0), endDate: "2026-02-30" }
    expect(() => validateProject(invalid)).toThrow(GanttValidationError)
  })

  it("開始日が終了日より後なら GanttValidationError を投げる", () => {
    const invalid = {
      ...buildProject("p1", "m1", 0),
      startDate: "2026-11-01",
      endDate: "2026-10-31",
    }
    expect(() => validateProject(invalid)).toThrow(
      "開始日は終了日以前の日付にしてください",
    )
  })

  it("形が不正なら GanttValidationError を投げる", () => {
    const invalid = { ...buildProject("p1", "m1", 0), sortOrder: -1 }
    expect(() => validateProject(invalid)).toThrow(GanttValidationError)
  })
})

describe("buildReorderedMembers", () => {
  const members = [
    buildMember("a", 0),
    buildMember("b", 1),
    buildMember("c", 2),
  ]

  it("渡された順に sortOrder を振り直す", () => {
    const result = buildReorderedMembers(
      members,
      ["c", "a", "b"],
      NEW_TIMESTAMP,
    )
    expect(result.map((member) => [member.id, member.sortOrder])).toEqual([
      ["c", 0],
      ["a", 1],
      ["b", 2],
    ])
  })

  it("順番が変わった担当者だけ updatedAt を更新する", () => {
    // 先頭の a は 0 番のまま。b と c が入れ替わる
    const result = buildReorderedMembers(
      members,
      ["a", "c", "b"],
      NEW_TIMESTAMP,
    )
    expect(result.map((member) => member.updatedAt)).toEqual([
      OLD_TIMESTAMP,
      NEW_TIMESTAMP,
      NEW_TIMESTAMP,
    ])
  })

  it("入力の配列を書き換えない", () => {
    buildReorderedMembers(members, ["c", "b", "a"], NEW_TIMESTAMP)
    expect(members.map((member) => member.sortOrder)).toEqual([0, 1, 2])
  })

  it("id が重複していれば GanttValidationError を投げる", () => {
    expect(() =>
      buildReorderedMembers(members, ["a", "a", "b"], NEW_TIMESTAMP),
    ).toThrow(GanttValidationError)
  })

  it("存在しない id が含まれていれば GanttNotFoundError を投げる", () => {
    expect(() =>
      buildReorderedMembers(members, ["a", "b", "x"], NEW_TIMESTAMP),
    ).toThrow(GanttNotFoundError)
  })

  it("id が足りなければ GanttValidationError を投げる", () => {
    expect(() =>
      buildReorderedMembers(members, ["a", "b"], NEW_TIMESTAMP),
    ).toThrow(GanttValidationError)
  })
})

describe("buildReorderedProjects", () => {
  const projects = [
    buildProject("p1", "m1", 0),
    buildProject("p2", "m1", 1),
    buildProject("p3", "m1", 2),
  ]

  it("渡された順に sortOrder を振り直し、変わった案件だけ updatedAt を更新する", () => {
    const result = buildReorderedProjects(
      projects,
      ["p1", "p3", "p2"],
      NEW_TIMESTAMP,
    )
    expect(
      result.map((project) => [
        project.id,
        project.sortOrder,
        project.updatedAt,
      ]),
    ).toEqual([
      ["p1", 0, OLD_TIMESTAMP],
      ["p3", 1, NEW_TIMESTAMP],
      ["p2", 2, NEW_TIMESTAMP],
    ])
  })

  it("入力の配列を書き換えない", () => {
    buildReorderedProjects(projects, ["p3", "p2", "p1"], NEW_TIMESTAMP)
    expect(projects.map((project) => project.sortOrder)).toEqual([0, 1, 2])
  })

  it("id が重複していれば GanttValidationError を投げる", () => {
    expect(() =>
      buildReorderedProjects(projects, ["p1", "p1", "p2"], NEW_TIMESTAMP),
    ).toThrow(GanttValidationError)
  })

  it("別の担当者の案件や存在しない id は GanttValidationError を投げる", () => {
    expect(() =>
      buildReorderedProjects(projects, ["p1", "p2", "other"], NEW_TIMESTAMP),
    ).toThrow(GanttValidationError)
  })

  it("id が足りなければ GanttValidationError を投げる", () => {
    expect(() =>
      buildReorderedProjects(projects, ["p1", "p2"], NEW_TIMESTAMP),
    ).toThrow(GanttValidationError)
  })

  it("案件が 0 件で空の id を渡したときは空配列を返す", () => {
    expect(buildReorderedProjects([], [], NEW_TIMESTAMP)).toEqual([])
  })
})
