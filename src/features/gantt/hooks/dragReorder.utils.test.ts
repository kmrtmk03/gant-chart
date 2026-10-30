import { describe, expect, it } from "vitest"

import { DRAG_THRESHOLD_PX } from "../gantt.constants"
import {
  getDragReorderResult,
  getDropIndex,
  getDropIndicator,
  startDragReorder,
  updateDragReorder,
  type IDragReorderState,
  type IRowRect,
} from "./dragReorder.utils"

/** 高さ 36px の行を、上端 100px から隙間なく並べた位置 */
function buildRowRects(count: number, height = 36, top = 100): IRowRect[] {
  return Array.from({ length: count }, (_, index) => ({
    top: top + index * height,
    bottom: top + (index + 1) * height,
  }))
}

const IDS = ["a", "b", "c", "d"]
const POINTER_ID = 1

/** `index` 番目の行の中央をつかんで、Y 座標を順に動かした後の状態を返す */
function dragThrough(
  index: number,
  pointerYs: number[],
  rowRects: IRowRect[] = buildRowRects(IDS.length),
): IDragReorderState | null {
  const rect = rowRects[index]
  if (rect === undefined) throw new Error("行がありません")
  const startY = (rect.top + rect.bottom) / 2
  let state: IDragReorderState | null = startDragReorder(
    IDS[index] ?? "",
    POINTER_ID,
    startY,
    rowRects,
    index,
  )
  for (const pointerY of pointerYs) {
    state = updateDragReorder(state, POINTER_ID, pointerY)
  }
  return state
}

describe("getDropIndex", () => {
  const rects = buildRowRects(4) // 中央: 118 / 154 / 190 / 226

  it("ポインターより中央が上にある行（つかんだ行を除く）の数を返す", () => {
    expect(getDropIndex(rects, 0, 160)).toBe(1)
    expect(getDropIndex(rects, 0, 200)).toBe(2)
    expect(getDropIndex(rects, 3, 150)).toBe(1)
  })

  it("一番上より上・一番下より下に出ても、先頭・末尾で止まる", () => {
    expect(getDropIndex(rects, 2, -1000)).toBe(0)
    expect(getDropIndex(rects, 1, 10000)).toBe(3)
  })

  it("行の高さが違っても、測った位置から求める", () => {
    // 2 行目だけ高い（エラー表示などで広がった行）
    const uneven: IRowRect[] = [
      { top: 0, bottom: 40 }, // 中央 20
      { top: 40, bottom: 140 }, // 中央 90
      { top: 140, bottom: 180 }, // 中央 160
    ]
    expect(getDropIndex(uneven, 0, 80)).toBe(0)
    expect(getDropIndex(uneven, 0, 100)).toBe(1)
    expect(getDropIndex(uneven, 2, 85)).toBe(1)
  })

  it("1 行だけなら常に 0", () => {
    expect(getDropIndex(buildRowRects(1), 0, 9999)).toBe(0)
  })
})

describe("updateDragReorder", () => {
  it("しきい値未満の移動では、落とす先を元の位置のままにする", () => {
    const state = dragThrough(0, [118 + DRAG_THRESHOLD_PX - 1])
    expect(state?.isDragging).toBe(false)
    expect(state?.toIndex).toBe(0)
  })

  it("しきい値を超えたら、移動量と落とす先を更新する", () => {
    const state = dragThrough(0, [200])
    expect(state).toMatchObject({ isDragging: true, offsetY: 82, toIndex: 2 })
  })

  it("一度しきい値を超えたら、元の位置に戻しても isDragging のまま", () => {
    const state = dragThrough(1, [300, 154])
    expect(state).toMatchObject({ isDragging: true, offsetY: 0, toIndex: 1 })
  })

  it("別のポインターの動き・ドラッグしていないときは状態を変えない", () => {
    const state = dragThrough(0, [])
    expect(updateDragReorder(state, POINTER_ID + 1, 500)).toBe(state)
    expect(updateDragReorder(null, POINTER_ID, 500)).toBeNull()
  })
})

describe("getDragReorderResult", () => {
  it("しきい値未満で離したらクリック扱い", () => {
    const state = dragThrough(0, [120])
    expect(state && getDragReorderResult(IDS, state)).toEqual({
      type: "click",
    })
  })

  it("元の位置で離したら保存しない", () => {
    const state = dragThrough(1, [300, 150])
    expect(state && getDragReorderResult(IDS, state)).toEqual({
      type: "unchanged",
    })
  })

  it("下へ動かしたら、並べ替え後の id の並びを返す", () => {
    const state = dragThrough(0, [200])
    expect(state && getDragReorderResult(IDS, state)).toEqual({
      type: "commit",
      orderedIds: ["b", "c", "a", "d"],
    })
  })

  it("一番上より上に出したら先頭へ", () => {
    const state = dragThrough(3, [-500])
    expect(state && getDragReorderResult(IDS, state)).toEqual({
      type: "commit",
      orderedIds: ["d", "a", "b", "c"],
    })
  })

  it("一番下より下に出したら末尾へ", () => {
    const state = dragThrough(1, [5000])
    expect(state && getDragReorderResult(IDS, state)).toEqual({
      type: "commit",
      orderedIds: ["a", "c", "d", "b"],
    })
  })
})

describe("getDropIndicator", () => {
  it("下へ動かすときは、落とす先の行の下に線を出す", () => {
    const state = dragThrough(0, [200]) // toIndex 2
    expect(IDS.map((_, index) => getDropIndicator(state, index))).toEqual([
      null,
      null,
      "after",
      null,
    ])
  })

  it("上へ動かすときは、落とす先の行の上に線を出す", () => {
    const state = dragThrough(3, [150]) // toIndex 1
    expect(IDS.map((_, index) => getDropIndicator(state, index))).toEqual([
      null,
      "before",
      null,
      null,
    ])
  })

  it("ドラッグ前・元の位置・ドラッグしていないときは出さない", () => {
    expect(getDropIndicator(dragThrough(0, [120]), 0)).toBeNull()
    expect(getDropIndicator(dragThrough(1, [300, 154]), 1)).toBeNull()
    expect(getDropIndicator(null, 0)).toBeNull()
  })
})
