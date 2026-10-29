import { type UIEvent, useCallback, useState } from "react"
import { flushSync } from "react-dom"

import {
  DAY_COLUMN_WIDTH,
  DEFAULT_RANGE_DAYS_BEFORE,
  RANGE_EDGE_THRESHOLD_PX,
  RANGE_EXTEND_DAYS,
  RANGE_SHIFT_DAYS,
  TODAY_SCROLL_MARGIN_DAYS,
} from "../gantt.constants"
import type { TDateString } from "../gantt.type"
import { addDays, diffInDays } from "../gantt.utils"

interface IUseTimelineScrollParams {
  /** タイムラインに用意した範囲の最初の日。未確定の間は null */
  rangeStart: TDateString | null
  today: TDateString | null
  /** 範囲を過去側に広げる（広げた分のスクロール補正はこのフックが行う） */
  onExtendBackward: () => void
  /** 範囲を未来側に広げる */
  onExtendForward: () => void
}

/**
 * タイムラインのスクロール領域を制御する。無限スクロールの要になるフック。
 * - スクロール領域に `attachScroller` を渡し、`onScroll` に `handleScroll` を渡すこと
 * - 端に近づいたら `onExtendBackward` / `onExtendForward` で範囲を広げさせる。
 *   過去側に広げると全体が右にずれるので、広げた日数ぶんスクロール位置を補正して見ている位置を保つ
 * - 画面の左端にある日付を `visibleDate` として返す（ヘッダーの年月表示用）
 */
export function useTimelineScroll({
  rangeStart,
  today,
  onExtendBackward,
  onExtendForward,
}: IUseTimelineScrollParams) {
  // ref ではなく state で持つ（要素が付いたときに再描画され、関数が最新の要素を参照できる）
  const [scrollerElement, setScrollerElement] = useState<HTMLDivElement | null>(
    null,
  )
  const [visibleDate, setVisibleDate] = useState<TDateString | null>(null)

  /**
   * スクロール領域の ref。要素が現れた時点（読み込み完了後の最初の描画）で、今日が見える位置にそろえる。
   * 初期位置は範囲の取り方（今日の何日前から始めるか）だけで決まり、日付に依存しない。
   */
  const attachScroller = useCallback((element: HTMLDivElement | null) => {
    setScrollerElement(element)
    if (element === null) return
    element.scrollLeft =
      (DEFAULT_RANGE_DAYS_BEFORE - TODAY_SCROLL_MARGIN_DAYS) * DAY_COLUMN_WIDTH
  }, [])

  /** スクロールのたびに、見えている日付の更新と、端に近づいたときの範囲の拡張を行う */
  const handleScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      const element = event.currentTarget
      if (rangeStart === null) return

      // 左のリストは sticky で動かないので、scrollLeft ぶんがそのまま左端の日付の位置になる
      setVisibleDate(
        addDays(rangeStart, Math.floor(element.scrollLeft / DAY_COLUMN_WIDTH)),
      )

      if (element.scrollLeft < RANGE_EDGE_THRESHOLD_PX) {
        // 範囲が左に広がると全体が右にずれる。描画を同期で終わらせてから、広げた分だけ右にずらして
        // 見ている位置を保つ（イベントハンドラの中なので flushSync を使える）
        flushSync(onExtendBackward)
        element.scrollLeft += RANGE_EXTEND_DAYS * DAY_COLUMN_WIDTH
      }
      const distanceToRightEdge =
        element.scrollWidth - element.scrollLeft - element.clientWidth
      if (distanceToRightEdge < RANGE_EDGE_THRESHOLD_PX) {
        onExtendForward()
      }
    },
    [rangeStart, onExtendBackward, onExtendForward],
  )

  /** 今日が見える位置までスクロールする */
  const scrollToToday = useCallback(() => {
    const element = scrollerElement
    if (element === null || rangeStart === null || today === null) return
    const todayIndex = diffInDays(rangeStart, today)
    element.scrollTo({
      left: (todayIndex - TODAY_SCROLL_MARGIN_DAYS) * DAY_COLUMN_WIDTH,
      behavior: "smooth",
    })
  }, [scrollerElement, rangeStart, today])

  /** 日数ぶん左右にスクロールする（マイナスで過去側） */
  const scrollByDays = useCallback(
    (days: number) => {
      scrollerElement?.scrollBy({
        left: days * DAY_COLUMN_WIDTH,
        behavior: "smooth",
      })
    },
    [scrollerElement],
  )

  const scrollBackward = useCallback(
    () => scrollByDays(-RANGE_SHIFT_DAYS),
    [scrollByDays],
  )
  const scrollForward = useCallback(
    () => scrollByDays(RANGE_SHIFT_DAYS),
    [scrollByDays],
  )

  return {
    // 状態
    visibleDate,
    // スクロール領域に渡すもの
    attachScroller,
    handleScroll,
    // 操作
    scrollToToday,
    scrollBackward,
    scrollForward,
  }
}
