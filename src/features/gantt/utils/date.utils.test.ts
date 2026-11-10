import { describe, expect, it } from "vitest"

import {
  addDays,
  diffInDays,
  formatYearMonth,
  getDateRange,
  getDayColumns,
  getHolidayName,
  getMonthSegments,
  isHoliday,
  isWeekend,
  parseDateString,
  toDateString,
} from "./date.utils"

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

  it("桁数が足りない形式（1 桁の月日・2 桁の年）は RangeError", () => {
    expect(() => parseDateString("2026-1-5")).toThrow(RangeError)
    expect(() => parseDateString("2026-01-5")).toThrow(RangeError)
    expect(() => parseDateString("26-01-05")).toThrow(RangeError)
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

describe("formatYearMonth", () => {
  it("月の先頭のゼロを除いて表示する", () => {
    expect(formatYearMonth("2026-05-06")).toBe("2026年5月")
    expect(formatYearMonth("2026-12-31")).toBe("2026年12月")
  })
})

describe("getDayColumns", () => {
  it("土日・祝日の情報を日ごとに付ける", () => {
    // 2026-05-02（土）〜 05-06（水・振替休日）
    const columns = getDayColumns("2026-05-02", 5)
    expect(columns.map((column) => column.date)).toEqual([
      "2026-05-02",
      "2026-05-03",
      "2026-05-04",
      "2026-05-05",
      "2026-05-06",
    ])
    expect(columns.map((column) => column.isWeekend)).toEqual([
      true,
      true,
      false,
      false,
      false,
    ])
    // 5/2 は土曜、5/3 は日曜
    expect(columns.map((column) => column.isSaturday)).toEqual([
      true,
      false,
      false,
      false,
      false,
    ])
    expect(columns[1]?.holidayName).not.toBeNull()
    expect(columns[4]?.holidayName).not.toBeNull()
  })

  it("月の 1 日の列だけ isMonthStart が true", () => {
    const columns = getDayColumns("2026-10-30", 4)
    expect(columns.map((column) => column.isMonthStart)).toEqual([
      false,
      false,
      true,
      false,
    ])
  })

  it("日数が 0 なら空配列", () => {
    expect(getDayColumns("2026-05-02", 0)).toEqual([])
  })
})

describe("getMonthSegments", () => {
  it("月またぎを月ごとの日数にまとめる", () => {
    const segments = getMonthSegments(getDayColumns("2026-10-30", 5))
    expect(segments).toEqual([
      { key: "2026-10", label: "2026年10月", days: 2 },
      { key: "2026-11", label: "2026年11月", days: 3 },
    ])
  })

  it("年またぎでも年を区別する", () => {
    const segments = getMonthSegments(getDayColumns("2026-12-31", 2))
    expect(segments.map((segment) => segment.label)).toEqual([
      "2026年12月",
      "2027年1月",
    ])
  })

  it("列が空なら空配列", () => {
    expect(getMonthSegments([])).toEqual([])
  })
})
