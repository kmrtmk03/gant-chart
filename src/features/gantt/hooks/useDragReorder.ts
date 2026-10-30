import { useCallback, useEffect, useRef, useState } from "react"
import type { PointerEvent as ReactPointerEvent } from "react"

import {
  getDragReorderResult,
  getDropIndicator,
  startDragReorder,
  updateDragReorder,
  type IDragReorderState,
  type IRowRect,
  type TDropIndicator,
} from "./dragReorder.utils"

/** マウスの主ボタン（左ボタン）。タッチ・ペンの接触も 0 になる */
const PRIMARY_BUTTON = 0

interface IUseDragReorderParams {
  /**
   * 並んでいる id（表示順）。フックはこの並びだけを扱い、`onReorder` にもこれを並べ替えたものを渡す。
   * ここに渡していない id（表示していない行など）を含めた全体の並びに戻すのは、呼び出し側の責務
   */
  ids: string[]
  /**
   * 並べ替え後の id の並びを保存する。離して位置が変わったときに 1 回だけ呼ぶ。
   * 失敗の表示は呼び出し側が行うこと（例外を投げない契約）。完了（成功・失敗とも）するまでは並べ替え後の並びで描き、
   * 完了したら `ids` の並びに戻す（成功していれば `ids` が新しい並びになっている）
   */
  onReorder: (orderedIds: string[]) => Promise<void>
  /** true の間はドラッグを始めない（保存中など） */
  isDisabled: boolean
}

/** 行 1 つぶんのドラッグの状態。行の見た目（浮かせる・挿入位置の線）に使う */
export interface IDragReorderRowState {
  /** つかまれていて、しきい値を超えて動かしている行か */
  isDragging: boolean
  /** つかまれた行をポインターに追従させる縦の移動量（px）。つかまれていない行は 0 */
  offsetY: number
  /** 挿入位置の目印 */
  dropIndicator: TDropIndicator
}

/**
 * 行の縦の位置を、今の画面の座標（clientY と同じ）で測る。
 * getBoundingClientRect ではなく offsetTop / offsetHeight を使うのは、ドラッグ中の行に付けた transform の影響を受けず、
 * 動かす前の位置を測れるようにするため。offsetTop は offsetParent（位置の基準の要素）からの距離なので、
 * offsetParent の画面上の位置を足し、そのスクロール量を引いて画面の座標にそろえる。
 * 画面に出ていない（offsetParent がない）ときは null
 */
function measureRowRect(element: HTMLElement): IRowRect | null {
  const parent = element.offsetParent
  if (!(parent instanceof HTMLElement)) return null
  const top =
    parent.getBoundingClientRect().top +
    parent.clientTop -
    parent.scrollTop +
    element.offsetTop
  return { top, bottom: top + element.offsetHeight }
}

/** つかまれていない行の状態。毎回作らずに使い回す */
const IDLE_ROW_STATE: IDragReorderRowState = {
  isDragging: false,
  offsetY: 0,
  dropIndicator: null,
}

/**
 * つかみのドラッグで、id の並びの中の 1 つを動かすフック。並べる対象（案件・担当者）は知らない。
 * 状態遷移の計算は `dragReorder.utils.ts` が受け持つ。
 *
 * 使い方:
 * - 各行の要素を `registerRow(id, element)` で登録する（ref のコールバックから呼ぶ）。行の位置を測るのに使う
 * - つかみの `onPointerDown` で `handleHandlePointerDown(id, event)`、`onLostPointerCapture` で `handleLostPointerCapture` を呼ぶ
 * - 行は `displayIds` の順に描き、`getRowState(id)` で浮かせる量・挿入位置の線を決める
 *
 * 流れ:
 * 1. つかみの pointerdown で、ポインターをキャプチャし、各行の位置を測ってドラッグを始める
 * 2. ドラッグ中だけ window に pointermove / pointerup / pointercancel / keydown / scroll を登録する（同じ effect の中で解除する）。
 *    ポインターの動きとスクロールのたびに行の位置を測り直す（ドラッグ中に行の高さが変わっても、落とす先がずれないように）
 * 3. 動いている間は並びを変えず、つかんだ行を浮かせて追従させ、落とす先に線を出す
 * 4. 離したとき、位置が変わっていれば `onReorder`。しきい値未満（クリック）なら何もしない
 * 5. pointercancel・Esc・キャプチャを失ったときは取り消して元に戻す
 */
export function useDragReorder({
  ids,
  onReorder,
  isDisabled,
}: IUseDragReorderParams) {
  // ドラッグ中の状態。描画用の state と、イベントのハンドラーから最新値を読むための ref を同時に更新する
  // （pointermove が描画より速く続けて来ても、古い値で計算しないため）
  const [dragState, setDragState] = useState<IDragReorderState | null>(null)
  const dragStateRef = useRef<IDragReorderState | null>(null)
  // 保存中の並び。保存が終わるまでは、この並びで描く
  const [savingIds, setSavingIds] = useState<string[] | null>(null)
  // 登録された行の要素（id → 要素）
  const rowElementsRef = useRef(new Map<string, HTMLElement>())
  // キャプチャしている要素。取り消すときにキャプチャを外すために持つ
  const capturedElementRef = useRef<Element | null>(null)
  // 最後に受けたポインターの Y 座標。スクロールしただけのとき（ポインターは動いていない）の計算に使う
  const lastClientYRef = useRef(0)

  /** 状態を ref と state の両方に反映する。ドラッグの状態はこの関数でだけ書き換えること */
  const applyDragState = useCallback((next: IDragReorderState | null) => {
    dragStateRef.current = next
    setDragState(next)
  }, [])

  /**
   * 行の要素を登録する（null で登録を外す）。ref のコールバックから呼ぶこと。
   * MEMO: 要素は ref に持つだけで、描画には使わない（行の位置を測るためだけのもの）
   */
  const registerRow = useCallback((id: string, element: HTMLElement | null) => {
    if (element === null) {
      rowElementsRef.current.delete(id)
    } else {
      rowElementsRef.current.set(id, element)
    }
  }, [])

  /**
   * `rowIds` の並びのとおりに各行の位置を測る。
   * 登録されていない・画面に出ていない行があるとき（描画の途中など）は null
   */
  const measureRowRects = useCallback((rowIds: string[]): IRowRect[] | null => {
    const rowRects: IRowRect[] = []
    for (const rowId of rowIds) {
      const element = rowElementsRef.current.get(rowId)
      const rect = element === undefined ? null : measureRowRect(element)
      if (rect === null) return null
      rowRects.push(rect)
    }
    return rowRects
  }, [])

  /** ドラッグを終える（取り消し・離したときの共通処理）。キャプチャを外し、状態を消す */
  const endDrag = useCallback(() => {
    const state = dragStateRef.current
    applyDragState(null)
    // キャプチャを外す。外したことで lostpointercapture が来ても、状態は null なので何もしない
    const element = capturedElementRef.current
    capturedElementRef.current = null
    if (state !== null && element?.hasPointerCapture(state.pointerId)) {
      element.releasePointerCapture(state.pointerId)
    }
  }, [applyDragState])

  /** ドラッグを取り消して元の並びに戻す */
  const cancelDrag = useCallback(() => {
    if (dragStateRef.current === null) return
    endDrag()
  }, [endDrag])

  /** つかみの pointerdown。`id` はその行の id */
  const handleHandlePointerDown = useCallback(
    (id: string, event: ReactPointerEvent<Element>) => {
      // 主ボタン以外・無効・保存中・すでに別のポインターでドラッグ中のときは始めない
      if (event.button !== PRIMARY_BUTTON) return
      if (isDisabled || savingIds !== null || dragStateRef.current !== null) {
        return
      }

      // つかんだ時点の各行の位置を測る。測れない行があるとき（描画の途中など）は始めない
      const rowRects = measureRowRects(ids)
      const fromIndex = ids.indexOf(id)
      if (rowRects === null || fromIndex === -1) return

      // MEMO: preventDefault はしない。すると入力欄からフォーカスが外れず（blur が来ない）、
      // 管理ダイアログで編集中の名前が保存されないまま残るため。タッチのスクロールはつかみの
      // touch-action: none で、テキストの選択はつかみの user-select: none で防いでいる
      // 行の外にポインターが出ても、このあとのイベントがこの要素に届くようにする
      event.currentTarget.setPointerCapture(event.pointerId)
      capturedElementRef.current = event.currentTarget
      lastClientYRef.current = event.clientY
      applyDragState(
        startDragReorder(
          id,
          event.pointerId,
          event.clientY,
          rowRects,
          fromIndex,
        ),
      )
    },
    [ids, isDisabled, savingIds, measureRowRects, applyDragState],
  )

  /** キャプチャを失った（要素が消えた・ブラウザが外した）とき。ドラッグ中なら取り消す */
  const handleLostPointerCapture = useCallback(() => {
    capturedElementRef.current = null
    cancelDrag()
  }, [cancelDrag])

  // ドラッグ中だけ window にイベントを登録する。登録と解除はこの effect の中で完結させる。
  // MEMO: 要素ではなく window で受けるのは、ポインターが行の外へ出ても離した操作を受け取るため（帯のドラッグと同じ）
  const isDragActive = dragState !== null
  useEffect(() => {
    if (!isDragActive) return

    /** 今のポインターの位置と、測り直した行の位置で状態を更新する（測れなければ前回の位置を使う） */
    const updateWithPointer = (pointerId: number, clientY: number) => {
      lastClientYRef.current = clientY
      const next = updateDragReorder(
        dragStateRef.current,
        pointerId,
        clientY,
        measureRowRects(ids) ?? undefined,
      )
      if (next !== dragStateRef.current) applyDragState(next)
      return next
    }

    const handlePointerMove = (event: PointerEvent) => {
      updateWithPointer(event.pointerId, event.clientY)
    }

    const handlePointerUp = (event: PointerEvent) => {
      if (dragStateRef.current?.pointerId !== event.pointerId) return
      // 最後の位置まで反映してから結果を決める
      const state = updateWithPointer(event.pointerId, event.clientY)
      endDrag()
      if (state === null) return

      const result = getDragReorderResult(ids, state)
      if (result.type !== "commit") return

      setSavingIds(result.orderedIds)
      onReorder(result.orderedIds)
        .catch((caught: unknown) => {
          // MEMO: 失敗の表示は呼び出し側の責務（onReorder は例外を投げない契約）。
          // 契約が崩れて例外が来ても unhandled rejection にしないよう、ここではコンソールに残すだけにする
          console.error("並び順を保存できませんでした", caught)
        })
        .finally(() => setSavingIds(null))
    }

    const handlePointerCancel = (event: PointerEvent) => {
      if (dragStateRef.current?.pointerId !== event.pointerId) return
      cancelDrag()
    }

    // ポインターを止めたままスクロールしたときも、落とす先と行の追従を更新する
    const handleScroll = () => {
      const state = dragStateRef.current
      if (state === null) return
      updateWithPointer(state.pointerId, lastClientYRef.current)
    }

    // Esc はドラッグの取り消しだけに使う。サイドパネルの Esc（document で受けている）や、
    // 管理ダイアログ（<dialog>）が Esc で閉じるのを防ぐため、window のキャプチャ段階で受けて止める
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      event.preventDefault()
      event.stopPropagation()
      cancelDrag()
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)
    window.addEventListener("pointercancel", handlePointerCancel)
    // スクロールはバブリングしないので、どの要素のスクロールも受けられるようキャプチャ段階で受ける
    window.addEventListener("scroll", handleScroll, { capture: true })
    window.addEventListener("keydown", handleKeyDown, { capture: true })
    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
      window.removeEventListener("pointercancel", handlePointerCancel)
      window.removeEventListener("scroll", handleScroll, { capture: true })
      window.removeEventListener("keydown", handleKeyDown, { capture: true })
    }
  }, [
    isDragActive,
    ids,
    onReorder,
    measureRowRects,
    applyDragState,
    endDrag,
    cancelDrag,
  ])

  /** 行 1 つぶんのドラッグの状態を返す。`id` は `displayIds` の要素 */
  const getRowState = useCallback(
    (id: string): IDragReorderRowState => {
      if (dragState === null) return IDLE_ROW_STATE
      const isActive = dragState.activeId === id && dragState.isDragging
      return {
        isDragging: isActive,
        offsetY: isActive ? dragState.offsetY : 0,
        // ドラッグ中は並びを変えないので、`ids` の添字がそのまま行の位置になる
        dropIndicator: getDropIndicator(dragState, ids.indexOf(id)),
      }
    },
    [dragState, ids],
  )

  return {
    // 状態
    /** 描く並び。保存中は並べ替え後の並び、それ以外は `ids`（ドラッグ中も並びは変えない） */
    displayIds: savingIds ?? ids,
    /** しきい値を超えてドラッグしている間 true（カーソルの表示などに使う） */
    isDragging: dragState?.isDragging ?? false,
    isSaving: savingIds !== null,
    getRowState,
    // 行・つかみに渡すもの
    registerRow,
    handleHandlePointerDown,
    handleLostPointerCapture,
  }
}
