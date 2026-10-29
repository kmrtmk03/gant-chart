import { useCallback, useState, useSyncExternalStore } from "react"

import {
  DEFAULT_RANGE_DAYS,
  DEFAULT_RANGE_DAYS_BEFORE,
  RANGE_SHIFT_DAYS,
} from "../gantt.constants"
import type { TDateString } from "../gantt.type"
import { addDays, getToday } from "../gantt.utils"

/** 何も購読しない subscribe。今日の日付は外から変化を通知されないため */
const subscribeNothing = () => () => {}

/** サーバー側のレンダリング中は今日を決めない（`cacheComponents` で現在時刻を静的シェルに焼き込まないため） */
const getServerToday = () => null

/**
 * タイムラインの表示期間（開始日と日数）と、前後への移動・今日へ戻る操作を持つ。
 * 今日の日付が決まる前（サーバー側のレンダリング中・ハイドレーション直後）は `today` と `rangeStart` が null。
 * 呼び出し側は null の間は期間に依存する描画を見送ること。
 * MEMO: 日付をまたいで開きっぱなしにしても `today` は更新されない（再読み込みで直る）。
 */
export function useTimelineRange() {
  const today = useSyncExternalStore<TDateString | null>(
    subscribeNothing,
    getToday,
    getServerToday,
  )
  // ユーザーが移動した後の開始日。null の間は「今日の少し前」を開始日にする
  const [shiftedRangeStart, setShiftedRangeStart] =
    useState<TDateString | null>(null)

  const defaultRangeStart =
    today === null ? null : addDays(today, -DEFAULT_RANGE_DAYS_BEFORE)
  const rangeStart = shiftedRangeStart ?? defaultRangeStart

  /** 表示期間を `days` 日ずらす。開始日が決まる前は何もしない */
  const shiftRange = useCallback(
    (days: number) => {
      if (rangeStart === null) return
      setShiftedRangeStart(addDays(rangeStart, days))
    },
    [rangeStart],
  )

  const shiftBackward = useCallback(
    () => shiftRange(-RANGE_SHIFT_DAYS),
    [shiftRange],
  )
  const shiftForward = useCallback(
    () => shiftRange(RANGE_SHIFT_DAYS),
    [shiftRange],
  )
  /** 初期表示（今日の少し前から）に戻す */
  const resetToToday = useCallback(() => setShiftedRangeStart(null), [])

  return {
    // 状態
    today,
    rangeStart,
    rangeDays: DEFAULT_RANGE_DAYS,
    // 操作
    shiftBackward,
    shiftForward,
    resetToToday,
  }
}
