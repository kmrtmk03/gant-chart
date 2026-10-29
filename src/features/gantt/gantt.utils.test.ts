import { describe, expect, it } from "vitest"

import { DAY_COLUMN_WIDTH } from "./gantt.constants"
import {
  addDays,
  diffInDays,
  getBarLayout,
  getDateRange,
  getHolidayName,
  getTodayOffset,
  isHoliday,
  isRangeOverlapping,
  isWeekend,
  moveProjectDates,
  parseDateString,
  pxToDays,
  resizeProjectDates,
  toDateString,
} from "./gantt.utils"

describe("toDateString / parseDateString", () => {
  it("Date と相互変換でき、ローカル時刻の年月日が保たれる", () => {
    const date = parseDateString("2026-10-29")
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([
      2026, 9, 29,
    ])
    expect(toDateString(date)).toBe("2026-10-29")
  })

  it("ローカル時刻の早朝 0 時台でも日付がずれない", () => {
    expect(toDateString(new Date(2026, 0, 1, 0, 30))).toBe("2026-01-01")
  })

  it("読めない文字列は RangeError", () => {
    expect(() => parseDateString("2026-02-30")).toThrow(RangeError)
    expect(() => parseDateString("abc")).toThrow(RangeError)
  })
})

describe("addDays / diffInDays", () => {
  it("月またぎ・年またぎ", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01")
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01")
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31")
  })

  it("うるう年（2028-02-29）を含む", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29")
    expect(addDays("2028-02-29", 1)).toBe("2028-03-01")
    expect(addDays("2027-02-28", 1)).toBe("2027-03-01")
    expect(diffInDays("2028-02-28", "2028-03-01")).toBe(2)
  })

  it("diffInDays は前後・同日で符号が合う", () => {
    expect(diffInDays("2026-10-29", "2026-11-02")).toBe(4)
    expect(diffInDays("2026-11-02", "2026-10-29")).toBe(-4)
    expect(diffInDays("2026-10-29", "2026-10-29")).toBe(0)
  })

  it("年またぎの差", () => {
    expect(diffInDays("2026-12-31", "2027-01-01")).toBe(1)
  })
})

describe("getDateRange", () => {
  it("開始日から指定日数分を返す（月またぎ）", () => {
    expect(getDateRange("2026-10-30", 4)).toEqual([
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
      "2026-11-02",
    ])
  })

  it("0 日以下は空配列", () => {
    expect(getDateRange("2026-10-30", 0)).toEqual([])
    expect(getDateRange("2026-10-30", -3)).toEqual([])
  })
})

describe("isWeekend", () => {
  it("土日は true、平日は false", () => {
    expect(isWeekend("2026-10-31")).toBe(true) // 土
    expect(isWeekend("2026-11-01")).toBe(true) // 日
    expect(isWeekend("2026-10-30")).toBe(false) // 金
    expect(isWeekend("2026-11-02")).toBe(false) // 月
  })
})

describe("isHoliday / getHolidayName", () => {
  it("元日", () => {
    expect(isHoliday("2027-01-01")).toBe(true)
    expect(getHolidayName("2027-01-01")).toBe("元日")
  })

  it("振替休日（憲法記念日が日曜の 2026-05-03 → 05-06）", () => {
    expect(isHoliday("2026-05-06")).toBe(true)
    // MEMO: 名前はライブラリの表記に依存するため、振替休日であることだけを確かめる
    expect(getHolidayName("2026-05-06")).toContain("振替休日")
  })

  it("祝日でない日は false / null", () => {
    expect(isHoliday("2026-10-29")).toBe(false)
    expect(getHolidayName("2026-10-29")).toBeNull()
  })
})

describe("isRangeOverlapping", () => {
  const rangeStart = "2026-10-10"
  const rangeEnd = "2026-10-20"

  it("期間の内側・両端の 1 日だけ重なる場合は true", () => {
    expect(
      isRangeOverlapping("2026-10-12", "2026-10-15", rangeStart, rangeEnd),
    ).toBe(true)
    expect(
      isRangeOverlapping("2026-10-01", "2026-10-10", rangeStart, rangeEnd),
    ).toBe(true)
    expect(
      isRangeOverlapping("2026-10-20", "2026-10-30", rangeStart, rangeEnd),
    ).toBe(true)
  })

  it("表示期間を丸ごと含む案件は true", () => {
    expect(
      isRangeOverlapping("2026-09-01", "2026-11-30", rangeStart, rangeEnd),
    ).toBe(true)
  })

  it("まったく入らない案件は false", () => {
    expect(
      isRangeOverlapping("2026-10-01", "2026-10-09", rangeStart, rangeEnd),
    ).toBe(false)
    expect(
      isRangeOverlapping("2026-10-21", "2026-10-30", rangeStart, rangeEnd),
    ).toBe(false)
  })
})

describe("getBarLayout", () => {
  const rangeStart = "2026-10-10"
  const rangeDays = 10 // 10-10 〜 10-19

  it("表示期間の内側の案件は left / width が列幅の倍数になる", () => {
    expect(
      getBarLayout(
        { startDate: "2026-10-12", endDate: "2026-10-14" },
        rangeStart,
        rangeDays,
      ),
    ).toEqual({
      left: 2 * DAY_COLUMN_WIDTH,
      width: 3 * DAY_COLUMN_WIDTH,
      isClippedStart: false,
      isClippedEnd: false,
    })
  })

  it("1 日だけの案件（開始日 = 終了日）は幅が 1 列分", () => {
    const layout = getBarLayout(
      { startDate: "2026-10-15", endDate: "2026-10-15" },
      rangeStart,
      rangeDays,
    )
    expect(layout?.width).toBe(DAY_COLUMN_WIDTH)
    expect(layout?.left).toBe(5 * DAY_COLUMN_WIDTH)
  })

  it("左にはみ出す案件は 0 から始め、左が切れたと返す", () => {
    expect(
      getBarLayout(
        { startDate: "2026-10-05", endDate: "2026-10-11" },
        rangeStart,
        rangeDays,
      ),
    ).toEqual({
      left: 0,
      width: 2 * DAY_COLUMN_WIDTH,
      isClippedStart: true,
      isClippedEnd: false,
    })
  })

  it("右にはみ出す案件は期間の末尾で切り、右が切れたと返す", () => {
    expect(
      getBarLayout(
        { startDate: "2026-10-18", endDate: "2026-10-25" },
        rangeStart,
        rangeDays,
      ),
    ).toEqual({
      left: 8 * DAY_COLUMN_WIDTH,
      width: 2 * DAY_COLUMN_WIDTH,
      isClippedStart: false,
      isClippedEnd: true,
    })
  })

  it("両側にはみ出す案件は表示期間いっぱいになる", () => {
    expect(
      getBarLayout(
        { startDate: "2026-09-01", endDate: "2026-12-31" },
        rangeStart,
        rangeDays,
      ),
    ).toEqual({
      left: 0,
      width: rangeDays * DAY_COLUMN_WIDTH,
      isClippedStart: true,
      isClippedEnd: true,
    })
  })

  it("まったく入らない案件は null", () => {
    expect(
      getBarLayout(
        { startDate: "2026-10-01", endDate: "2026-10-09" },
        rangeStart,
        rangeDays,
      ),
    ).toBeNull()
    expect(
      getBarLayout(
        { startDate: "2026-10-20", endDate: "2026-10-25" },
        rangeStart,
        rangeDays,
      ),
    ).toBeNull()
  })

  it("表示期間の最初の日・最後の日だけの案件も描ける", () => {
    expect(
      getBarLayout(
        { startDate: "2026-10-10", endDate: "2026-10-10" },
        rangeStart,
        rangeDays,
      )?.left,
    ).toBe(0)
    expect(
      getBarLayout(
        { startDate: "2026-10-19", endDate: "2026-10-19" },
        rangeStart,
        rangeDays,
      )?.left,
    ).toBe(9 * DAY_COLUMN_WIDTH)
  })

  it("月またぎ・年またぎでも位置がずれない", () => {
    expect(
      getBarLayout(
        { startDate: "2027-01-01", endDate: "2027-01-02" },
        "2026-12-30",
        5,
      ),
    ).toEqual({
      left: 2 * DAY_COLUMN_WIDTH,
      width: 2 * DAY_COLUMN_WIDTH,
      isClippedStart: false,
      isClippedEnd: false,
    })
  })
})

describe("getTodayOffset", () => {
  it("今日の列の左端を返す", () => {
    expect(getTodayOffset("2026-10-22", 60, "2026-10-29")).toBe(
      7 * DAY_COLUMN_WIDTH,
    )
  })

  it("表示期間の最初の日は 0、最後の日は末尾の列", () => {
    expect(getTodayOffset("2026-10-29", 10, "2026-10-29")).toBe(0)
    expect(getTodayOffset("2026-10-20", 10, "2026-10-29")).toBe(
      9 * DAY_COLUMN_WIDTH,
    )
  })

  it("表示期間の外なら null", () => {
    expect(getTodayOffset("2026-10-30", 10, "2026-10-29")).toBeNull()
    expect(getTodayOffset("2026-10-19", 10, "2026-10-29")).toBeNull()
  })
})

describe("pxToDays", () => {
  it("列幅ちょうどで 1 日、複数列で複数日", () => {
    expect(pxToDays(DAY_COLUMN_WIDTH)).toBe(1)
    expect(pxToDays(DAY_COLUMN_WIDTH * 3)).toBe(3)
  })

  it("列幅の半分未満は 0、半分ちょうどは 1 日に切り上げる", () => {
    expect(pxToDays(DAY_COLUMN_WIDTH / 2 - 1)).toBe(0)
    expect(pxToDays(DAY_COLUMN_WIDTH / 2)).toBe(1)
  })

  it("マイナス方向も対称（半分ちょうどは -1 日、半分未満は 0）", () => {
    expect(pxToDays(-DAY_COLUMN_WIDTH)).toBe(-1)
    expect(pxToDays(-DAY_COLUMN_WIDTH / 2)).toBe(-1)
    expect(pxToDays(-(DAY_COLUMN_WIDTH / 2 - 1))).toBe(0)
    expect(pxToDays(-DAY_COLUMN_WIDTH * 1.5)).toBe(-2)
  })

  it("移動量 0 は -0 ではなく 0", () => {
    expect(Object.is(pxToDays(0), 0)).toBe(true)
    expect(Object.is(pxToDays(-1), 0)).toBe(true)
  })
})

describe("moveProjectDates", () => {
  it("期間の長さを保ったまま動かす", () => {
    expect(
      moveProjectDates({ startDate: "2026-10-29", endDate: "2026-11-02" }, 3),
    ).toEqual({ startDate: "2026-11-01", endDate: "2026-11-05" })
  })

  it("マイナス・年またぎ・うるう日をまたいでも長さが変わらない", () => {
    expect(
      moveProjectDates({ startDate: "2027-01-02", endDate: "2027-01-03" }, -3),
    ).toEqual({ startDate: "2026-12-30", endDate: "2026-12-31" })
    expect(
      moveProjectDates({ startDate: "2028-02-28", endDate: "2028-03-01" }, 1),
    ).toEqual({ startDate: "2028-02-29", endDate: "2028-03-02" })
  })
})

describe("resizeProjectDates", () => {
  const project = { startDate: "2026-10-10", endDate: "2026-10-14" }

  it("開始日側を伸ばす・縮める", () => {
    expect(resizeProjectDates(project, "start", -2)).toEqual({
      startDate: "2026-10-08",
      endDate: "2026-10-14",
    })
    expect(resizeProjectDates(project, "start", 2)).toEqual({
      startDate: "2026-10-12",
      endDate: "2026-10-14",
    })
  })

  it("終了日側を伸ばす・縮める", () => {
    expect(resizeProjectDates(project, "end", 3)).toEqual({
      startDate: "2026-10-10",
      endDate: "2026-10-17",
    })
    expect(resizeProjectDates(project, "end", -2)).toEqual({
      startDate: "2026-10-10",
      endDate: "2026-10-12",
    })
  })

  it("開始日を終了日ちょうどまで縮めると 1 日の案件になる", () => {
    expect(resizeProjectDates(project, "start", 4)).toEqual({
      startDate: "2026-10-14",
      endDate: "2026-10-14",
    })
  })

  it("開始日は終了日を追い越さず、終了日で止まる", () => {
    expect(resizeProjectDates(project, "start", 10)).toEqual({
      startDate: "2026-10-14",
      endDate: "2026-10-14",
    })
  })

  it("終了日は開始日を追い越さず、開始日で止まる", () => {
    expect(resizeProjectDates(project, "end", -10)).toEqual({
      startDate: "2026-10-10",
      endDate: "2026-10-10",
    })
  })

  it("1 日だけの案件でも逆転しない", () => {
    const oneDay = { startDate: "2026-10-10", endDate: "2026-10-10" }
    expect(resizeProjectDates(oneDay, "start", 1)).toEqual(oneDay)
    expect(resizeProjectDates(oneDay, "end", -1)).toEqual(oneDay)
  })
})
