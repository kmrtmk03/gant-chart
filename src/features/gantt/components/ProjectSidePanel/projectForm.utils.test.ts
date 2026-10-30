import { describe, expect, it } from "vitest"

import {
  DEFAULT_BAR_COLOR,
  PROJECT_NAME_MAX_LENGTH,
} from "../../gantt.constants"
import type { IMember, IProject } from "../../gantt.type"
import type { IProjectFormValues } from "./projectForm.type"
import {
  createInitialFormValues,
  toProjectInput,
  validateProjectForm,
} from "./projectForm.utils"

const TIMESTAMP = "2026-10-29T00:00:00.000Z"

const MEMBERS: IMember[] = [
  {
    id: "m1",
    name: "田中",
    sortOrder: 0,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  },
  {
    id: "m2",
    name: "佐藤",
    sortOrder: 1,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  },
]

const PROJECT: IProject = {
  id: "p1",
  memberId: "m2",
  name: "既存の案件",
  startDate: "2026-11-01",
  endDate: "2026-11-10",
  color: "green",
  note: "メモ",
  sortOrder: 0,
  completedAt: null,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
}

const VALID_VALUES: IProjectFormValues = {
  memberId: "m1",
  name: "新しい案件",
  startDate: "2026-11-01",
  endDate: "2026-11-05",
  color: "blue",
  note: "",
}

describe("createInitialFormValues", () => {
  it("編集のときは案件の内容をそのまま初期値にする", () => {
    expect(
      createInitialFormValues(MEMBERS, PROJECT, null, "2026-10-29"),
    ).toEqual({
      memberId: "m2",
      name: "既存の案件",
      startDate: "2026-11-01",
      endDate: "2026-11-10",
      color: "green",
      note: "メモ",
    })
  })

  it("追加のときは指定の担当者・今日の 1 日・既定の色にする", () => {
    expect(createInitialFormValues(MEMBERS, null, "m2", "2026-10-29")).toEqual({
      memberId: "m2",
      name: "",
      startDate: "2026-10-29",
      endDate: "2026-10-29",
      color: DEFAULT_BAR_COLOR,
      note: "",
    })
  })

  it("初期選択の担当者が存在しない・未指定のときは先頭の担当者にする", () => {
    expect(
      createInitialFormValues(MEMBERS, null, "gone", "2026-10-29").memberId,
    ).toBe("m1")
    expect(
      createInitialFormValues(MEMBERS, null, null, "2026-10-29").memberId,
    ).toBe("m1")
  })

  it("担当者が 0 人のときは担当者を空にする", () => {
    expect(createInitialFormValues([], null, null, "2026-10-29").memberId).toBe(
      "",
    )
  })
})

describe("validateProjectForm", () => {
  it("正しい入力ならエラーはない", () => {
    expect(validateProjectForm(VALID_VALUES, MEMBERS)).toEqual({})
  })

  it("開始日と終了日が同じ日でもよい", () => {
    const values = { ...VALID_VALUES, endDate: VALID_VALUES.startDate }
    expect(validateProjectForm(values, MEMBERS)).toEqual({})
  })

  it("案件名が空・空白だけならエラーにする", () => {
    expect(
      validateProjectForm({ ...VALID_VALUES, name: "" }, MEMBERS).name,
    ).toBeDefined()
    expect(
      validateProjectForm({ ...VALID_VALUES, name: " 　 " }, MEMBERS).name,
    ).toBeDefined()
  })

  it("案件名は前後の空白を除いた文字数で最大文字数を判定する", () => {
    const maxName = "あ".repeat(PROJECT_NAME_MAX_LENGTH)
    expect(
      validateProjectForm({ ...VALID_VALUES, name: ` ${maxName} ` }, MEMBERS)
        .name,
    ).toBeUndefined()
    expect(
      validateProjectForm({ ...VALID_VALUES, name: `${maxName}あ` }, MEMBERS)
        .name,
    ).toBeDefined()
  })

  it("担当者が未選択・存在しないならエラーにする", () => {
    expect(
      validateProjectForm({ ...VALID_VALUES, memberId: "" }, MEMBERS).memberId,
    ).toBeDefined()
    expect(
      validateProjectForm({ ...VALID_VALUES, memberId: "gone" }, MEMBERS)
        .memberId,
    ).toBeDefined()
  })

  it("日付が未入力・実在しないならエラーにする", () => {
    const errors = validateProjectForm(
      { ...VALID_VALUES, startDate: "", endDate: "2026-02-30" },
      MEMBERS,
    )
    expect(errors.startDate).toBeDefined()
    expect(errors.endDate).toBeDefined()
  })

  it("開始日が終了日より後なら終了日にエラーを付ける", () => {
    const errors = validateProjectForm(
      { ...VALID_VALUES, startDate: "2026-11-10", endDate: "2026-11-01" },
      MEMBERS,
    )
    expect(errors.endDate).toBeDefined()
    expect(errors.startDate).toBeUndefined()
  })

  it("複数の項目のエラーをまとめて返す", () => {
    const errors = validateProjectForm(
      { ...VALID_VALUES, name: "", memberId: "" },
      MEMBERS,
    )
    expect(Object.keys(errors).sort()).toEqual(["memberId", "name"])
  })
})

describe("toProjectInput", () => {
  it("案件名の前後の空白を除いて、repository への入力にする", () => {
    expect(
      toProjectInput({ ...VALID_VALUES, name: "  案件 A  ", note: " メモ " }),
    ).toEqual({
      memberId: "m1",
      name: "案件 A",
      startDate: "2026-11-01",
      endDate: "2026-11-05",
      color: "blue",
      note: " メモ ",
    })
  })
})
