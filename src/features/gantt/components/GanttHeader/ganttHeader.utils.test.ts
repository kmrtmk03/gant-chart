import { describe, expect, it } from "vitest"

import { formatCompletedToggleLabel } from "./ganttHeader.utils"

describe("formatCompletedToggleLabel", () => {
  it("完了済みの件数を添える", () => {
    expect(formatCompletedToggleLabel(3)).toBe("完了済みを表示（3）")
  })

  it("0 件でも件数を出す", () => {
    expect(formatCompletedToggleLabel(0)).toBe("完了済みを表示（0）")
  })
})
