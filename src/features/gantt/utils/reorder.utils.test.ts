import { describe, expect, it } from "vitest"

import { moveIdAmongVisible, moveIdToIndex } from "./reorder.utils"

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
