import { useCallback, useState, useSyncExternalStore } from "react"

import {
  DEFAULT_RANGE_DAYS,
  DEFAULT_RANGE_DAYS_BEFORE,
  RANGE_EXTEND_DAYS,
} from "../gantt.constants"
import type { TDateString } from "../gantt.type"
import { addDays, diffInDays, getToday } from "../gantt.utils"

/** 何も購読しない subscribe。範囲の起点は外から変化を通知されないため */
const subscribeNothing = () => () => {}

/** サーバー側のレンダリング中は日付を決めない（`cacheComponents` で現在時刻を静的シェルに焼き込まないため） */
const getServerDate = () => null

/**
 * 範囲の起点にする日付。ブラウザで最初に読んだ今日を、以降は同じ値で返し続ける。
 * `useSyncExternalStore` は再描画のたびに getSnapshot を呼び直すので、毎回 `getToday()` を返すと、
 * 日付をまたいだ後の再描画で範囲の開始日だけが 1 日進む。`scrollLeft` は補正されないため、
 * 見ていた日付が突然ずれ、ヘッダーの年月とも食い違ってしまう。
 * 「今日」（今日の線・強調・今日ボタン）はこれとは別に、`subscribeToToday` で最新の日付を追いかける。
 */
let rangeAnchorDate: TDateString | null = null
const getRangeAnchorDate = (): TDateString => (rangeAnchorDate ??= getToday())

/** 日付が変わる可能性のある時点の、余裕を持たせた待ち時間（ms）。0 時ちょうどのずれを避けるため */
const MIDNIGHT_MARGIN_MS = 1000

/**
 * 「今日」の変化を購読する。次の 0 時の少し後にタイマーで通知し、PC のスリープなどでタイマーが
 * 遅れても追いつけるよう、画面にフォーカスが戻ったとき・タブが表示されたときにも通知する。
 * 通知を受けた側（useSyncExternalStore）は `getToday()` を取り直し、日付が変わっていたときだけ再描画する。
 */
function subscribeToToday(onChange: () => void): () => void {
  let timerId: ReturnType<typeof setTimeout> | undefined

  const scheduleNextMidnight = () => {
    const now = new Date()
    const nextMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
    )
    timerId = setTimeout(
      () => {
        onChange()
        scheduleNextMidnight()
      },
      nextMidnight.getTime() - now.getTime() + MIDNIGHT_MARGIN_MS,
    )
  }
  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") onChange()
  }

  scheduleNextMidnight()
  window.addEventListener("focus", onChange)
  document.addEventListener("visibilitychange", handleVisibilityChange)
  return () => {
    clearTimeout(timerId)
    window.removeEventListener("focus", onChange)
    document.removeEventListener("visibilitychange", handleVisibilityChange)
  }
}

/**
 * タイムラインに用意する日付の範囲（開始日と日数）を持つ。
 * 範囲は「最初に開いた日の少し前〜数か月先」から始まり、スクロールが端に近づくたびに
 * `extendBackward` / `extendForward` で広げていく（縮めない）。表示位置の制御は `useTimelineScroll` が受け持つ。
 * - `rangeStart` は最初に開いた日を起点に固定する。日付をまたいでも動かさない（動くと表示位置とずれる）
 * - `today` は別に管理し、日付が変わったら更新する。日付をまたいでも今日の線・強調・今日ボタンは正しい日を指す
 * 日付が決まる前（サーバー側のレンダリング中・ハイドレーション直後）は `today` と `rangeStart` が null。
 * 呼び出し側は null の間は期間に依存する描画を見送ること。
 */
export function useTimelineRange() {
  const rangeAnchor = useSyncExternalStore<TDateString | null>(
    subscribeNothing,
    getRangeAnchorDate,
    getServerDate,
  )
  const today = useSyncExternalStore<TDateString | null>(
    subscribeToToday,
    getToday,
    getServerDate,
  )
  // 初期の範囲に対して、前後に何日ぶん広げたか
  const [extraDaysBefore, setExtraDaysBefore] = useState(0)
  const [extraDaysAfter, setExtraDaysAfter] = useState(0)

  const rangeStart =
    rangeAnchor === null
      ? null
      : addDays(rangeAnchor, -(DEFAULT_RANGE_DAYS_BEFORE + extraDaysBefore))
  // 開いたままで今日が初期の範囲を超えた場合に備え、今日の先に RANGE_EXTEND_DAYS 日ぶんの余白が残るよう
  // 未来側の日数を足す。今日の線・強調が描画され、「今日」ボタンが右端に丸められずに届くようにするため。
  // 足す日数は `extraDaysAfter` に依存させない（依存させると、端での拡張が打ち消されて広がらなくなる）
  const baseRangeDays = DEFAULT_RANGE_DAYS + extraDaysBefore
  const daysForToday =
    rangeStart === null || today === null
      ? 0
      : Math.max(
          0,
          diffInDays(rangeStart, today) + 1 + RANGE_EXTEND_DAYS - baseRangeDays,
        )
  const rangeDays = baseRangeDays + extraDaysAfter + daysForToday

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
