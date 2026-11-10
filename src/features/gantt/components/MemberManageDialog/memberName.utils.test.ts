import { describe, expect, it } from "vitest"

import type { IMember } from "../../gantt.type"
import { hasSameNameMember, validateMemberName } from "./memberName.utils"

describe("validateMemberName", () => {
  it("名前があればエラーなし", () => {
    expect(validateMemberName("鈴木")).toBeNull()
  })

  it("空文字・空白だけは必須エラー", () => {
    expect(validateMemberName("")).not.toBeNull()
    expect(validateMemberName("  \u3000 ")).not.toBeNull()
  })

  it("前後の空白を除いて 50 文字までは通り、51 文字は文字数エラー", () => {
    expect(validateMemberName(` ${"あ".repeat(50)} `)).toBeNull()
    expect(validateMemberName("あ".repeat(51))).toContain("50")
  })
})

describe("hasSameNameMember", () => {
  const createNamedMember = (id: string): IMember => ({
    id,
    name: id,
    sortOrder: 0,
    createdAt: "",
    updatedAt: "",
  })
  const members = [createNamedMember("a"), createNamedMember("b")]

  it("同じ名前の担当者がいれば true（前後の空白は無視）", () => {
    expect(hasSameNameMember(" a ", members)).toBe(true)
  })

  it("いなければ false、空の名前も false", () => {
    expect(hasSameNameMember("c", members)).toBe(false)
    expect(hasSameNameMember("  ", members)).toBe(false)
  })

  it("excludeMemberId の担当者自身は数えない", () => {
    expect(hasSameNameMember("a", members, "a")).toBe(false)
    expect(hasSameNameMember("a", members, "b")).toBe(true)
  })
})
