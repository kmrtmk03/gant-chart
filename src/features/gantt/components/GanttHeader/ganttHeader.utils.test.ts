import { describe, expect, it } from "vitest"

import {
  formatCompletedToggleLabel,
  formatCompletedToggleShortLabel,
} from "./ganttHeader.utils"

describe("formatCompletedToggleLabel", () => {
  it("完了済みの件数を添える", () => {
    expect(formatCompletedToggleLabel(3)).toBe("完了済みを表示（3）")
  })

  it("0 件でも件数を出す", () => {
    expect(formatCompletedToggleLabel(0)).toBe("完了済みを表示（0）")
  })
})

describe("formatCompletedToggleShortLabel", () => {
  it("狭い画面向けに「を表示」を省き、件数は添える", () => {
    expect(formatCompletedToggleShortLabel(3)).toBe("完了済み（3）")
    expect(formatCompletedToggleShortLabel(0)).toBe("完了済み（0）")
  })
})
