import { useCallback, useEffect, useRef, useState } from "react"
import type { PointerEvent as ReactPointerEvent } from "react"

import type { TProjectPeriod } from "../../gantt.utils"
import {
  getBarDragResult,
  getDraggedPeriod,
  startBarDrag,
  updateBarDrag,
  type IBarDragState,
  type TBarDragMode,
} from "./barDrag.utils"

/** マウスの主ボタン（左ボタン）。タッチ・ペンの接触も 0 になる */
const PRIMARY_BUTTON = 0

interface IUseBarDragParams {
  /** ドラッグ前の期間（保存済みの案件の開始日・終了日） */
  period: TProjectPeriod
  /**
   * 変更後の期間を保存する。ポインターを離して期間が変わったときに 1 回だけ呼ぶ。
   * 失敗の表示は呼び出し側が行うこと。完了（成功・失敗とも）するまで帯は変更後の位置に描き、
   * 完了したら仮の期間を捨てて `period` の位置に戻す（成功していれば `period` が新しい値になっている）
   */
  onCommit: (period: TProjectPeriod) => Promise<void>
  /**
   * true の間はドラッグを始めない（クリックだけ受け付ける）。サイドパネルで編集中の案件に使う。
   * パネルのフォームの日付と、ドラッグで変えた期間が食い違わないようにするため
   */
  isDisabled: boolean
}

/**
 * 帯 1 本ぶんのドラッグ（移動・左右の端の伸縮）を扱うフック。状態遷移の計算は `barDrag.utils.ts` が受け持つ。
 *
 * 流れ:
 * 1. 帯の中央・端の `onPointerDown` で、ポインターをキャプチャしてドラッグを始める
 * 2. ドラッグ中だけ window に pointermove / pointerup / pointercancel / keydown を登録する（同じ effect の中で解除する）
 * 3. 動いている間は保存せず、`displayPeriod`（仮の期間）で帯を描く
 * 4. 離したとき、しきい値未満ならクリック扱い（後続の click でパネルが開く）。期間が変わっていれば `onCommit`
 * 5. pointercancel・Esc・キャプチャを失ったときは取り消して元に戻す
 *
 * ドラッグや取り消しのあとに来る click は `consumeClickSuppression` が true を返すので、呼び出し側は
 * click のハンドラーの先頭で必ず呼び、true ならパネルを開かないこと。
 */
export function useBarDrag({
  period,
  onCommit,
  isDisabled,
}: IUseBarDragParams) {
  // ドラッグ中の状態。描画用の state と、イベントのハンドラーから最新値を読むための ref を同時に更新する
  // （pointermove が描画より速く続けて来ても、古い値で計算しないため）
  const [dragState, setDragState] = useState<IBarDragState | null>(null)
  const dragStateRef = useRef<IBarDragState | null>(null)
  // 保存中の期間。保存が終わるまでは、この位置に帯を描く
  const [savingPeriod, setSavingPeriod] = useState<TProjectPeriod | null>(null)
  // ドラッグ・取り消しの直後の click を 1 回だけ無視するための印
  const shouldSuppressClickRef = useRef(false)
  // キャプチャしている要素。取り消すときにキャプチャを外すために持つ
  const capturedElementRef = useRef<Element | null>(null)

  /** 状態を ref と state の両方に反映する。ドラッグの状態はこの関数でだけ書き換えること */
  const applyDragState = useCallback((next: IBarDragState | null) => {
    dragStateRef.current = next
    setDragState(next)
  }, [])

  /** ドラッグを取り消して元の位置に戻す。直後の click も無視する（パネルを開かない） */
  const cancelDrag = useCallback(() => {
    const state = dragStateRef.current
    if (state === null) return
    shouldSuppressClickRef.current = true
    applyDragState(null)
    // キャプチャを外す。外したことで lostpointercapture が来ても、状態は null なので何もしない
    const element = capturedElementRef.current
    capturedElementRef.current = null
    if (element?.hasPointerCapture(state.pointerId)) {
      element.releasePointerCapture(state.pointerId)
    }
  }, [applyDragState])

  /** ドラッグを始める。中央（移動）・左右の端（伸縮）の pointerdown から呼ぶ */
  const beginDrag = useCallback(
    (mode: TBarDragMode, event: ReactPointerEvent<Element>) => {
      // 主ボタン以外・保存中・すでに別のポインターでドラッグ中のときは始めない
      if (event.button !== PRIMARY_BUTTON) return
      if (savingPeriod !== null || dragStateRef.current !== null) return

      // 前回の click が来なかった場合に印が残っていると、今回のクリックまで消えてしまうので戻す
      // （ドラッグできないときも、この後の click でパネルを開けるように戻しておく）
      shouldSuppressClickRef.current = false
      if (isDisabled) return
      // 帯の外にポインターが出ても、このあとのイベントがこの要素に届くようにする
      event.currentTarget.setPointerCapture(event.pointerId)
      capturedElementRef.current = event.currentTarget
      applyDragState(startBarDrag(mode, event.pointerId, event.clientX))
    },
    [savingPeriod, isDisabled, applyDragState],
  )

  const handleMovePointerDown = useCallback(
    (event: ReactPointerEvent<Element>) => beginDrag("move", event),
    [beginDrag],
  )

  // 端のつかみは帯（button）の中にあるので、帯の「移動」の pointerdown まで伝わらないよう止める
  const handleResizeStartPointerDown = useCallback(
    (event: ReactPointerEvent<Element>) => {
      event.stopPropagation()
      beginDrag("resize-start", event)
    },
    [beginDrag],
  )

  const handleResizeEndPointerDown = useCallback(
    (event: ReactPointerEvent<Element>) => {
      event.stopPropagation()
      beginDrag("resize-end", event)
    },
    [beginDrag],
  )

  /** キャプチャを失った（要素が消えた・ブラウザが外した）とき。ドラッグ中なら取り消す */
  const handleLostPointerCapture = useCallback(() => {
    capturedElementRef.current = null
    cancelDrag()
  }, [cancelDrag])

  // ドラッグ中だけ window にイベントを登録する。登録と解除はこの effect の中で完結させる。
  // MEMO: 要素ではなく window で受けるのは、帯が表示期間の外へ出て描かれなくなっても離した操作を受け取るため
  const isDragActive = dragState !== null
  useEffect(() => {
    if (!isDragActive) return

    const handlePointerMove = (event: PointerEvent) => {
      const next = updateBarDrag(
        dragStateRef.current,
        event.pointerId,
        event.clientX,
      )
      if (next !== dragStateRef.current) applyDragState(next)
    }

    const handlePointerUp = (event: PointerEvent) => {
      // 最後の位置まで反映してから結果を決める
      const state = updateBarDrag(
        dragStateRef.current,
        event.pointerId,
        event.clientX,
      )
      if (state === null || state.pointerId !== event.pointerId) return

      capturedElementRef.current = null
      applyDragState(null)
      const result = getBarDragResult(period, state)
      // クリック扱いのときだけ、後続の click でパネルを開かせる
      if (result.type === "click") return
      shouldSuppressClickRef.current = true
      if (result.type !== "commit") return

      setSavingPeriod(result.period)
      onCommit(result.period)
        .catch((caught: unknown) => {
          // MEMO: 失敗の表示は呼び出し側の責務（onCommit は例外を投げない契約）。
          // 契約が崩れて例外が来ても unhandled rejection にしないよう、ここではコンソールに残すだけにする
          console.error("帯の期間を保存できませんでした", caught)
        })
        .finally(() => setSavingPeriod(null))
    }

    const handlePointerCancel = (event: PointerEvent) => {
      if (dragStateRef.current?.pointerId !== event.pointerId) return
      cancelDrag()
    }

    // Esc はドラッグの取り消しだけに使う。サイドパネルの Esc（document で受けている）まで届くと
    // 編集中のパネルが閉じてしまうので、window のキャプチャ段階で受けて伝わるのを止める
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      event.preventDefault()
      event.stopPropagation()
      cancelDrag()
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)
    window.addEventListener("pointercancel", handlePointerCancel)
    window.addEventListener("keydown", handleKeyDown, { capture: true })
    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
      window.removeEventListener("pointercancel", handlePointerCancel)
      window.removeEventListener("keydown", handleKeyDown, { capture: true })
    }
  }, [isDragActive, period, onCommit, applyDragState, cancelDrag])

  /**
   * click のハンドラーの先頭で必ず呼ぶこと。ドラッグ・取り消しの直後のポインターの click なら true を返す。
   * true のときはパネルを開かない（ドラッグのあとにパネルが勝手に開くのを防ぐ）。
   * 印は click のたびに消す。キーボード（Enter / Space）の click は抑止しない。
   * 取り消しの後に click が来ず印が残っていても、キーボードではパネルを開けるようにするため
   *
   * @param isPointerClick ポインター（マウス・タッチ・ペン）による click か。`MouseEvent.detail > 0` で判定する
   */
  const consumeClickSuppression = useCallback((isPointerClick: boolean) => {
    const shouldSuppress = shouldSuppressClickRef.current
    shouldSuppressClickRef.current = false
    return shouldSuppress && isPointerClick
  }, [])

  // 描く期間: 保存中はその期間、ドラッグ中は仮の期間、それ以外は保存済みの期間
  const displayPeriod =
    savingPeriod ??
    (dragState === null ? period : getDraggedPeriod(period, dragState))

  return {
    // 状態
    displayPeriod,
    /** しきい値を超えてドラッグしている間 true（変更後の期間の表示やカーソルに使う） */
    isDragging: dragState?.isDragging ?? false,
    isSaving: savingPeriod !== null,
    // 帯の中央・端に渡すハンドラー
    handleMovePointerDown,
    handleResizeStartPointerDown,
    handleResizeEndPointerDown,
    handleLostPointerCapture,
    // click との区別
    consumeClickSuppression,
  }
}
