import { useCallback, useState, useSyncExternalStore } from "react"

import {
  DEFAULT_RANGE_DAYS,
  DEFAULT_RANGE_DAYS_BEFORE,
  RANGE_EXTEND_DAYS,
} from "../gantt.constants"
import type { TDateString } from "../gantt.type"
import { addDays, getToday } from "../gantt.utils"

/** 何も購読しない subscribe。今日の日付は外から変化を通知されないため */
const subscribeNothing = () => () => {}

/** サーバー側のレンダリング中は今日を決めない（`cacheComponents` で現在時刻を静的シェルに焼き込まないため） */
const getServerToday = () => null

/**
 * タイムラインに用意する日付の範囲（開始日と日数）を持つ。
 * 範囲は「今日の少し前〜数か月先」から始まり、スクロールが端に近づくたびに `extendBackward` / `extendForward`
 * で広げていく（縮めない）。表示位置の制御は `useTimelineScroll` が受け持つ。
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
  // 初期の範囲に対して、前後に何日ぶん広げたか
  const [extraDaysBefore, setExtraDaysBefore] = useState(0)
  const [extraDaysAfter, setExtraDaysAfter] = useState(0)

  const rangeStart =
    today === null
      ? null
      : addDays(today, -(DEFAULT_RANGE_DAYS_BEFORE + extraDaysBefore))
  const rangeDays = DEFAULT_RANGE_DAYS + extraDaysBefore + extraDaysAfter

  /** 範囲を過去側に広げる。呼び出し側は、広げた分だけスクロール位置を右にずらして見ている位置を保つこと */
  const extendBackward = useCallback(
    () => setExtraDaysBefore((prev) => prev + RANGE_EXTEND_DAYS),
    [],
  )
  /** 範囲を未来側に広げる */
  const extendForward = useCallback(
    () => setExtraDaysAfter((prev) => prev + RANGE_EXTEND_DAYS),
    [],
  )

  return {
    // 状態
    today,
    rangeStart,
    rangeDays,
    // 操作
    extendBackward,
    extendForward,
  }
}
