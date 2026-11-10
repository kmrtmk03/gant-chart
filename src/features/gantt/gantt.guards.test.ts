import { describe, expect, it } from "vitest"

import {
  isBarColor,
  isDateString,
  isMember,
  isMemberList,
  isProject,
  isProjectList,
} from "./gantt.guards"
import type { IMember, IProject } from "./gantt.type"

/** 正しい形の担当者 */
const VALID_MEMBER: IMember = {
  id: "member-1",
  name: "田中",
  sortOrder: 0,
  createdAt: "2026-10-29T00:00:00.000Z",
  updatedAt: "2026-10-29T00:00:00.000Z",
}

/** 正しい形の案件 */
const VALID_PROJECT: IProject = {
  id: "project-1",
  memberId: "member-1",
  name: "案件A",
  startDate: "2026-10-01",
  endDate: "2026-10-31",
  color: "blue",
  note: "",
  sortOrder: 0,
  completedAt: null,
  createdAt: "2026-10-29T00:00:00.000Z",
  updatedAt: "2026-10-29T00:00:00.000Z",
}

/** 指定したキーを取り除いたコピーを作る（欠けたフィールドの検証用） */
function omitKey(source: object, key: string): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(source).filter(([entryKey]) => entryKey !== key),
  )
}

describe("isDateString", () => {
  it.each(["2026-10-29", "2028-02-29", "2026-12-31", "2026-01-01"])(
    "実在する日付 %s を受け付ける",
    (value) => {
      expect(isDateString(value)).toBe(true)
    },
  )

  it.each([
    "2026-02-30",
    "2026-02-29",
    "2026-13-01",
    "2026-00-10",
    "2026-04-31",
  ])("実在しない日付 %s を弾く", (value) => {
    expect(isDateString(value)).toBe(false)
  })

  it.each([
    "2026-1-5",
    "2026/10/29",
    "20261029",
    "2026-10-29T00:00",
    "",
    " 2026-10-29",
  ])("形式が違う %s を弾く", (value) => {
    expect(isDateString(value)).toBe(false)
  })

  it.each([null, undefined, 20261029, new Date()])(
    "文字列でない値 %s を弾く",
    (value) => {
      expect(isDateString(value)).toBe(false)
    },
  )
})

describe("isBarColor", () => {
  it("プリセットのキーを受け付ける", () => {
    expect(isBarColor("blue")).toBe(true)
    expect(isBarColor("gray")).toBe(true)
  })

  it("プリセットにない値を弾く", () => {
    expect(isBarColor("pink")).toBe(false)
    expect(isBarColor("")).toBe(false)
    expect(isBarColor(1)).toBe(false)
  })

  it("Object の組み込みプロパティ名を弾く", () => {
    expect(isBarColor("toString")).toBe(false)
    expect(isBarColor("__proto__")).toBe(false)
  })
})

describe("isMember", () => {
  it("正しい形の担当者を受け付ける", () => {
    expect(isMember(VALID_MEMBER)).toBe(true)
  })

  it.each(Object.keys(VALID_MEMBER))("%s が欠けていたら弾く", (key) => {
    expect(isMember(omitKey(VALID_MEMBER, key))).toBe(false)
  })

  it("型の違うフィールドがあれば弾く", () => {
    expect(isMember({ ...VALID_MEMBER, name: 1 })).toBe(false)
    expect(isMember({ ...VALID_MEMBER, sortOrder: "0" })).toBe(false)
    expect(isMember({ ...VALID_MEMBER, sortOrder: Number.NaN })).toBe(false)
    expect(isMember({ ...VALID_MEMBER, createdAt: "日時ではない" })).toBe(false)
  })

  it("ID が空文字なら弾く", () => {
    expect(isMember({ ...VALID_MEMBER, id: "" })).toBe(false)
  })

  it("オブジェクトでない値を弾く", () => {
    expect(isMember(null)).toBe(false)
    expect(isMember("member")).toBe(false)
    expect(isMember([VALID_MEMBER])).toBe(false)
  })
})

describe("isProject", () => {
  it("正しい形の案件を受け付ける", () => {
    expect(isProject(VALID_PROJECT)).toBe(true)
  })

  it("開始日と終了日が同じ日でも受け付ける", () => {
    expect(
      isProject({ ...VALID_PROJECT, endDate: VALID_PROJECT.startDate }),
    ).toBe(true)
  })

  it.each(Object.keys(VALID_PROJECT))("%s が欠けていたら弾く", (key) => {
    expect(isProject(omitKey(VALID_PROJECT, key))).toBe(false)
  })

  it("型の違うフィールドがあれば弾く", () => {
    expect(isProject({ ...VALID_PROJECT, name: null })).toBe(false)
    expect(isProject({ ...VALID_PROJECT, note: undefined })).toBe(false)
    expect(isProject({ ...VALID_PROJECT, color: "pink" })).toBe(false)
    expect(isProject({ ...VALID_PROJECT, memberId: "" })).toBe(false)
  })

  it("sortOrder は 0 以上の整数だけを受け付ける", () => {
    expect(isProject({ ...VALID_PROJECT, sortOrder: 3 })).toBe(true)
    expect(isProject({ ...VALID_PROJECT, sortOrder: -1 })).toBe(false)
    expect(isProject({ ...VALID_PROJECT, sortOrder: 0.5 })).toBe(false)
    expect(isProject({ ...VALID_PROJECT, sortOrder: "0" })).toBe(false)
    expect(isProject({ ...VALID_PROJECT, sortOrder: Number.NaN })).toBe(false)
  })

  it("completedAt は null か日時の文字列だけを受け付ける", () => {
    expect(
      isProject({ ...VALID_PROJECT, completedAt: "2026-10-30T09:00:00.000Z" }),
    ).toBe(true)
    expect(isProject({ ...VALID_PROJECT, completedAt: "" })).toBe(false)
    expect(isProject({ ...VALID_PROJECT, completedAt: "完了" })).toBe(false)
    expect(isProject({ ...VALID_PROJECT, completedAt: true })).toBe(false)
    // バージョン 2 の構造（completedAt がない）は、移行してから読む前提なので弾く
    expect(isProject(omitKey(VALID_PROJECT, "completedAt"))).toBe(false)
  })

  it("実在しない日付を弾く", () => {
    expect(isProject({ ...VALID_PROJECT, endDate: "2026-02-30" })).toBe(false)
  })

  it("開始日が終了日より後なら弾く", () => {
    expect(
      isProject({
        ...VALID_PROJECT,
        startDate: "2026-11-01",
        endDate: "2026-10-31",
      }),
    ).toBe(false)
  })
})

describe("isMemberList / isProjectList", () => {
  it("空配列を受け付ける", () => {
    expect(isMemberList([])).toBe(true)
    expect(isProjectList([])).toBe(true)
  })

  it("すべての要素が正しければ受け付ける", () => {
    expect(
      isMemberList([VALID_MEMBER, { ...VALID_MEMBER, id: "member-2" }]),
    ).toBe(true)
    expect(isProjectList([VALID_PROJECT])).toBe(true)
  })

  it("1 つでも不正な要素があれば弾く", () => {
    expect(isMemberList([VALID_MEMBER, { id: "member-2" }])).toBe(false)
    expect(isProjectList([VALID_PROJECT, null])).toBe(false)
  })

  it("配列でない値を弾く", () => {
    expect(isMemberList(VALID_MEMBER)).toBe(false)
    expect(isProjectList({})).toBe(false)
    expect(isProjectList(null)).toBe(false)
  })
})
