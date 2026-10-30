import { describe, expect, it } from "vitest"

import { DAY_COLUMN_WIDTH } from "./gantt.constants"
import type { IMember, IProject } from "./gantt.type"
import {
  addDays,
  countCompletedProjects,
  diffInDays,
  excludeCompletedProjects,
  formatYearMonth,
  getBarLayout,
  getDateRange,
  getDayColumns,
  getHolidayName,
  getMonthSegments,
  getTodayOffset,
  groupProjectsByMember,
  hasSameNameMember,
  isHoliday,
  isRangeOverlapping,
  isWeekend,
  moveIdAmongVisible,
  moveIdToIndex,
  moveProjectDates,
  parseDateString,
  pxToDays,
  resizeProjectDates,
  toDateString,
  validateMemberName,
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
    expect(columns[1]?.holidayName).not.toBeNull()
    expect(columns[4]?.holidayName).not.toBeNull()
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

describe("moveIdToIndex", () => {
  it("指定した位置へ動かした並びを返す（上へ・下へ）", () => {
    expect(moveIdToIndex(["a", "b", "c", "d"], "a", 2)).toEqual([
      "b",
      "c",
      "a",
      "d",
    ])
    expect(moveIdToIndex(["a", "b", "c", "d"], "d", 1)).toEqual([
      "a",
      "d",
      "b",
      "c",
    ])
  })

  it("同じ位置なら同じ並び", () => {
    expect(moveIdToIndex(["a", "b"], "b", 1)).toEqual(["a", "b"])
  })

  it("位置は 0 〜 件数 - 1 に収める", () => {
    expect(moveIdToIndex(["a", "b", "c"], "b", -3)).toEqual(["b", "a", "c"])
    expect(moveIdToIndex(["a", "b", "c"], "b", 10)).toEqual(["a", "c", "b"])
  })

  it("含まれない id は null", () => {
    expect(moveIdToIndex(["a", "b"], "x", 0)).toBeNull()
  })

  it("元の配列は変更しない", () => {
    const ids = ["a", "b"]
    moveIdToIndex(ids, "a", 1)
    expect(ids).toEqual(["a", "b"])
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

describe("moveIdAmongVisible", () => {
  // 全体は A, B, C, D で、B は隠れている（見えているのは A, C, D）
  const allIds = ["A", "B", "C", "D"]
  const visibleIds = ["A", "C", "D"]

  it("見えている先頭へ動かすと、隠れた案件との前後関係を保つ（プランの例）", () => {
    expect(moveIdAmongVisible(allIds, visibleIds, "D", 0)).toEqual([
      "D",
      "A",
      "B",
      "C",
    ])
  })

  it("直後に見えている案件の直前に入れる", () => {
    // A を C と D の間へ → C の後ろの D の直前
    expect(moveIdAmongVisible(allIds, visibleIds, "A", 1)).toEqual([
      "B",
      "C",
      "A",
      "D",
    ])
    // C を A の前へ → A の直前（隠れた B は A の後ろのまま）
    expect(moveIdAmongVisible(allIds, visibleIds, "C", 0)).toEqual([
      "C",
      "A",
      "B",
      "D",
    ])
  })

  it("見えている末尾へ動かすと、最後に見えている案件の直後に入れる", () => {
    expect(moveIdAmongVisible(allIds, visibleIds, "A", 2)).toEqual([
      "B",
      "C",
      "D",
      "A",
    ])
    // 末尾に隠れた案件があるときは、その前（最後に見えている案件の直後）に入る
    expect(moveIdAmongVisible(["A", "B", "C"], ["A", "B"], "A", 1)).toEqual([
      "B",
      "A",
      "C",
    ])
  })

  it("すべて見えているときは moveIdToIndex と同じ並びになる", () => {
    expect(moveIdAmongVisible(allIds, allIds, "A", 2)).toEqual(
      moveIdToIndex(allIds, "A", 2),
    )
    expect(moveIdAmongVisible(allIds, allIds, "D", 0)).toEqual(
      moveIdToIndex(allIds, "D", 0),
    )
  })

  it("見えている案件が自分だけなら並びを変えない", () => {
    expect(moveIdAmongVisible(["A", "B"], ["B"], "B", 0)).toEqual(["A", "B"])
  })

  it("見えていない id・存在しない id は null", () => {
    expect(moveIdAmongVisible(allIds, visibleIds, "B", 0)).toBeNull()
    expect(moveIdAmongVisible(allIds, visibleIds, "Z", 0)).toBeNull()
  })
})
