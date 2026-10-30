import { type UIEvent, useCallback, useEffect, useRef, useState } from "react"
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

/** 範囲を一度に広げたとき、全体が右にずれる幅（px）。広げた直後のスクロール位置の補正に使う */
const EXTEND_PX = RANGE_EXTEND_DAYS * DAY_COLUMN_WIDTH

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

  // attachScroller は参照を保つため deps を持たせられない。要素が付く時点の最新の範囲・今日はここから読む
  const latestRangeRef = useRef({ rangeStart, today })
  useEffect(() => {
    latestRangeRef.current = { rangeStart, today }
  }, [rangeStart, today])

  /**
   * スクロール領域の ref。要素が現れた時点で、今日が見える位置にそろえる。
   * 初回は範囲が「今日の DEFAULT_RANGE_DAYS_BEFORE 日前」から始まるので固定の位置になるが、
   * 空の画面から担当者を追加し直した場合など、範囲が広がった後に要素が作り直されることがある。
   * その場合は広がった範囲と今日から位置を求める（固定の位置だと過去の日付が表示されるため）。
   */
  const attachScroller = useCallback((element: HTMLDivElement | null) => {
    setScrollerElement(element)
    if (element === null) return
    const { rangeStart: latestRangeStart, today: latestToday } =
      latestRangeRef.current
    const todayIndex =
      latestRangeStart === null || latestToday === null
        ? DEFAULT_RANGE_DAYS_BEFORE
        : diffInDays(latestRangeStart, latestToday)
    element.scrollLeft = Math.max(
      0,
      (todayIndex - TODAY_SCROLL_MARGIN_DAYS) * DAY_COLUMN_WIDTH,
    )
  }, [])

  /**
   * スクロールのたびに、見えている日付の更新と、端に近づいたときの範囲の拡張を行う。
   * 拡張は 2 回続けて走らないよう、どちらの側も `flushSync` で描画を済ませてから次のイベントを受ける
   * （描画前に scroll イベントが続けて届くと、端に近いまま何度も拡張してしまうため）。
   */
  const handleScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      const element = event.currentTarget
      if (rangeStart === null) return

      // 左のリストは sticky で動かないので、scrollLeft ぶんがそのまま左端の日付の位置になる
      setVisibleDate(
        addDays(rangeStart, Math.floor(element.scrollLeft / DAY_COLUMN_WIDTH)),
      )

      if (element.scrollLeft < RANGE_EDGE_THRESHOLD_PX) {
        // 範囲が左に広がると全体が右にずれるので、広げた分だけ右にずらして見ている位置を保つ
        // （イベントハンドラの中なので flushSync を使える）
        flushSync(onExtendBackward)
        element.scrollBy({ left: EXTEND_PX, behavior: "instant" })
      }
      const distanceToRightEdge =
        element.scrollWidth - element.scrollLeft - element.clientWidth
      if (distanceToRightEdge < RANGE_EDGE_THRESHOLD_PX) {
        flushSync(onExtendForward)
      }
    },
    [rangeStart, onExtendBackward, onExtendForward],
  )

  /**
   * 指定した位置（scrollLeft）までスクロールする。`behavior` が "smooth" ならなめらかに、"instant" なら瞬時に動く。
   * `scrollLeft` を書き換えるとスクロール中のアニメーションが打ち切られるため、目的地が左端に近いときは
   * アニメーションを始める前に範囲を広げ、目的地を広げた分だけずらしてから開始する。
   * これでアニメーションの途中で範囲の拡張（と位置の補正）が起きない。
   */
  const scrollToPosition = useCallback(
    (targetLeft: number, behavior: ScrollBehavior) => {
      if (scrollerElement === null) return
      let target = targetLeft
      while (target < RANGE_EDGE_THRESHOLD_PX) {
        flushSync(onExtendBackward)
        scrollerElement.scrollBy({ left: EXTEND_PX, behavior: "instant" })
        target += EXTEND_PX
      }
      scrollerElement.scrollTo({ left: target, behavior })
    },
    [scrollerElement, onExtendBackward],
  )

  /** 今日が見える位置まで、アニメーションなしで一気に移動する */
  const scrollToToday = useCallback(() => {
    if (scrollerElement === null || rangeStart === null || today === null) {
      return
    }
    const todayIndex = diffInDays(rangeStart, today)
    scrollToPosition(
      (todayIndex - TODAY_SCROLL_MARGIN_DAYS) * DAY_COLUMN_WIDTH,
      "instant",
    )
  }, [scrollerElement, rangeStart, today, scrollToPosition])

  /** 日数ぶん左右になめらかにスクロールする（マイナスで過去側） */
  const scrollByDays = useCallback(
    (days: number) => {
      if (scrollerElement === null) return
      scrollToPosition(
        scrollerElement.scrollLeft + days * DAY_COLUMN_WIDTH,
        "smooth",
      )
    },
    [scrollerElement, scrollToPosition],
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
