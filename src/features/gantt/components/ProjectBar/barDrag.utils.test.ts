import { describe, expect, it } from "vitest"

import { DAY_COLUMN_WIDTH, DRAG_THRESHOLD_PX } from "../../gantt.constants"
import type { TProjectPeriod } from "../../gantt.utils"
import {
  formatBarAriaLabel,
  formatBarPeriodLabel,
  getBarDragResult,
  getDraggedPeriod,
  isSamePeriod,
  startBarDrag,
  updateBarDrag,
  type IBarDragState,
  type TBarDragMode,
} from "./barDrag.utils"

const PERIOD: TProjectPeriod = {
  startDate: "2026-10-03",
  endDate: "2026-10-12",
}
const POINTER_ID = 1
const START_X = 500

/**
 * ポインターを押してから、`moves` の X 座標へ順に動かした後の状態を返す。
 * `useBarDrag` が pointerdown → pointermove… の順に呼ぶのと同じ流れを再現する
 */
function dragThrough(mode: TBarDragMode, moves: number[]): IBarDragState {
  let state: IBarDragState | null = startBarDrag(mode, POINTER_ID, START_X)
  for (const clientX of moves) {
    state = updateBarDrag(state, POINTER_ID, clientX)
  }
  if (state === null) throw new Error("状態が null になった")
  return state
}

describe("startBarDrag", () => {
  it("押した位置を起点に、移動 0 日・ドラッグ前の状態を作る", () => {
    expect(startBarDrag("move", POINTER_ID, START_X)).toEqual({
      mode: "move",
      pointerId: POINTER_ID,
      startClientX: START_X,
      deltaDays: 0,
      isDragging: false,
    })
  })
})

describe("updateBarDrag", () => {
  it("押していない（null）ときに動いても null のまま（pointerdown より先に move が来た場合）", () => {
    expect(updateBarDrag(null, POINTER_ID, START_X + 100)).toBeNull()
  })

  it("別のポインター（2 本目の指など）の動きは無視する", () => {
    const state = startBarDrag("move", POINTER_ID, START_X)
    expect(updateBarDrag(state, POINTER_ID + 1, START_X + 100)).toBe(state)
  })

  it("しきい値未満の移動ではドラッグにならない", () => {
    const state = dragThrough("move", [START_X + DRAG_THRESHOLD_PX - 1])
    expect(state.isDragging).toBe(false)
  })

  it("しきい値ちょうどでドラッグになる（左方向も同じ）", () => {
    expect(dragThrough("move", [START_X + DRAG_THRESHOLD_PX]).isDragging).toBe(
      true,
    )
    expect(dragThrough("move", [START_X - DRAG_THRESHOLD_PX]).isDragging).toBe(
      true,
    )
  })

  it("一度しきい値を超えたら、元の位置に戻してもドラッグのまま", () => {
    const state = dragThrough("move", [START_X + 40, START_X])
    expect(state).toMatchObject({ isDragging: true, deltaDays: 0 })
  })

  it("移動日数は 1 日単位に丸める（半分を超えたら次の日）", () => {
    const half = DAY_COLUMN_WIDTH / 2
    expect(dragThrough("move", [START_X + half - 1]).deltaDays).toBe(0)
    expect(dragThrough("move", [START_X + half]).deltaDays).toBe(1)
    expect(
      dragThrough("move", [START_X - DAY_COLUMN_WIDTH * 3]).deltaDays,
    ).toBe(-3)
  })
})

describe("getDraggedPeriod", () => {
  it("しきい値を超えるまでは元の期間のまま", () => {
    const state = dragThrough("move", [START_X + 2])
    expect(getDraggedPeriod(PERIOD, state)).toBe(PERIOD)
  })

  it("移動では期間の長さを保ったまま動く", () => {
    const state = dragThrough("move", [START_X + DAY_COLUMN_WIDTH * 2])
    expect(getDraggedPeriod(PERIOD, state)).toEqual({
      startDate: "2026-10-05",
      endDate: "2026-10-14",
    })
  })

  it("左端の伸縮では開始日だけが動く", () => {
    const state = dragThrough("resize-start", [START_X - DAY_COLUMN_WIDTH * 2])
    expect(getDraggedPeriod(PERIOD, state)).toEqual({
      startDate: "2026-10-01",
      endDate: "2026-10-12",
    })
  })

  it("右端の伸縮では終了日だけが動く", () => {
    const state = dragThrough("resize-end", [START_X + DAY_COLUMN_WIDTH])
    expect(getDraggedPeriod(PERIOD, state)).toEqual({
      startDate: "2026-10-03",
      endDate: "2026-10-13",
    })
  })

  it("左端を終了日より右へ引っぱっても、開始日は終了日で止まる", () => {
    const state = dragThrough("resize-start", [START_X + DAY_COLUMN_WIDTH * 30])
    expect(getDraggedPeriod(PERIOD, state)).toEqual({
      startDate: "2026-10-12",
      endDate: "2026-10-12",
    })
  })

  it("右端を開始日より左へ引っぱっても、終了日は開始日で止まる", () => {
    const state = dragThrough("resize-end", [START_X - DAY_COLUMN_WIDTH * 30])
    expect(getDraggedPeriod(PERIOD, state)).toEqual({
      startDate: "2026-10-03",
      endDate: "2026-10-03",
    })
  })
})

describe("getBarDragResult（ポインターを離したとき）", () => {
  it("押してすぐ離すとクリック", () => {
    expect(getBarDragResult(PERIOD, dragThrough("move", []))).toEqual({
      type: "click",
    })
  })

  it("しきい値未満だけ動かして離してもクリック", () => {
    const state = dragThrough("move", [START_X + 1, START_X - 2, START_X + 3])
    expect(getBarDragResult(PERIOD, state)).toEqual({ type: "click" })
  })

  it("1 日ぶん以上動かして離すと、変更後の期間を保存する", () => {
    const state = dragThrough("move", [
      START_X + 10,
      START_X + DAY_COLUMN_WIDTH,
    ])
    expect(getBarDragResult(PERIOD, state)).toEqual({
      type: "commit",
      period: { startDate: "2026-10-04", endDate: "2026-10-13" },
    })
  })

  it("しきい値は超えたが 1 日未満で離すと、クリックにも保存にもしない", () => {
    const state = dragThrough("move", [START_X + DRAG_THRESHOLD_PX + 1])
    expect(getBarDragResult(PERIOD, state)).toEqual({ type: "unchanged" })
  })

  it("動かした後で元の位置に戻して離すと、クリックにも保存にもしない", () => {
    const state = dragThrough("move", [START_X + DAY_COLUMN_WIDTH * 3, START_X])
    expect(getBarDragResult(PERIOD, state)).toEqual({ type: "unchanged" })
  })

  it("1 日だけの帯の端を反対側へ引っぱっても期間が変わらなければ保存しない", () => {
    const oneDay: TProjectPeriod = {
      startDate: "2026-10-03",
      endDate: "2026-10-03",
    }
    const state = dragThrough("resize-end", [START_X - DAY_COLUMN_WIDTH * 5])
    expect(getBarDragResult(oneDay, state)).toEqual({ type: "unchanged" })
  })
})

describe("isSamePeriod", () => {
  it("開始日・終了日の両方が同じときだけ true", () => {
    expect(isSamePeriod(PERIOD, { ...PERIOD })).toBe(true)
    expect(isSamePeriod(PERIOD, { ...PERIOD, endDate: "2026-10-13" })).toBe(
      false,
    )
  })
})

describe("formatBarPeriodLabel", () => {
  it("月/日 〜 月/日 の形式にする（先頭の 0 は付けない）", () => {
    expect(formatBarPeriodLabel(PERIOD)).toBe("10/3 〜 10/12")
  })

  it("年をまたぐ期間も月/日で表す", () => {
    expect(
      formatBarPeriodLabel({ startDate: "2026-12-30", endDate: "2027-01-02" }),
    ).toBe("12/30 〜 1/2")
  })
})

describe("formatBarAriaLabel", () => {
  it("案件名に 月日〜月日 を添える（先頭の 0 は付けない）", () => {
    expect(formatBarAriaLabel("案件A", PERIOD, false)).toBe(
      "案件A 10月3日〜10月12日",
    )
  })

  it("完了済みなら末尾に「完了済み」を付ける", () => {
    expect(formatBarAriaLabel("案件A", PERIOD, true)).toBe(
      "案件A 10月3日〜10月12日 完了済み",
    )
  })

  it("1 日だけの案件は同じ日を 2 回並べる", () => {
    expect(
      formatBarAriaLabel(
        "バナー",
        { startDate: "2026-11-14", endDate: "2026-11-14" },
        false,
      ),
    ).toBe("バナー 11月14日〜11月14日")
  })
})
