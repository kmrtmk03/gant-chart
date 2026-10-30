import { useCallback, useEffect, useRef, useState } from "react"
import type { FocusEvent, KeyboardEvent } from "react"
import { ja } from "react-day-picker/locale"
import { format } from "date-fns"

import { isDateString } from "../../gantt.guards"
import type { TDateString } from "../../gantt.type"
import { isHoliday, parseDateString, toDateString } from "../../gantt.utils"
import styles from "./DateField.module.scss"

interface IUseDateFieldParams {
  /** 選んでいる日付（"YYYY-MM-DD"）。読めない値のときは未選択として扱う */
  value: string
  onChange: (value: TDateString) => void
  align: "left" | "right"
}

/** 表示用の書式（例: "2026/10/30（金）"） */
const DISPLAY_FORMAT = "yyyy/MM/dd（E）"

/** 日曜・土曜（`getDay` の値）。タイムラインと同じく日曜と祝日を赤、土曜を青にする */
const SUNDAY = 0
const SATURDAY = 6

/** 祝日か。DayPicker の `modifiers` に渡す判定 */
const isHolidayDate = (date: Date) => isHoliday(toDateString(date))

/**
 * `DateField` 専用のフック。カレンダーの開閉と、"YYYY-MM-DD" ⇔ `Date` の変換を受け持つ。
 * - 閉じるのは、もう一度ボタンを押す・日付を選ぶ・Esc・外側をクリックしたとき
 * - Esc は `handleKeyDown`（ルート要素の `onKeyDown`）で止め、`document` の keydown を待つ
 *   サイドパネルの Esc まで届かないようにする（React のイベントは document より先に処理される）
 * - 閉じたあとはボタンにフォーカスを戻す
 */
export function useDateField({ value, onChange, align }: IUseDateFieldParams) {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // 型ガードを通った値だけ Date にする（読めない値は未選択として扱う）
  const selectedDate = isDateString(value) ? parseDateString(value) : undefined

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    buttonRef.current?.focus()
  }, [])

  // 外側をクリックしたら閉じる。開いている間だけ登録し、同じ effect の中で解除する。
  // フォーカスはクリックした先に任せるので、ここではボタンに戻さない
  useEffect(() => {
    if (!isOpen) return
    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        rootRef.current?.contains(event.target)
      ) {
        return
      }
      setIsOpen(false)
    }
    document.addEventListener("pointerdown", handlePointerDown)
    return () => document.removeEventListener("pointerdown", handlePointerDown)
  }, [isOpen])

  // キーボード（Tab）でフォーカスがカレンダーの外へ出たら閉じる。フォーカスはすでに移っているので、
  // ボタンには戻さない。移り先が分からない（null。ウィンドウの切り替えなど）ときは閉じない。
  // 外へ出たあとの Esc はパネルの Esc として働くので、未保存の入力が意図せず失われることもない
  const handleBlur = useCallback(
    (event: FocusEvent<HTMLDivElement>) => {
      if (!isOpen) return
      const next = event.relatedTarget
      if (next instanceof Node && !event.currentTarget.contains(next)) {
        setIsOpen(false)
      }
    },
    [isOpen],
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!isOpen || event.key !== "Escape") return
      // カレンダーだけを閉じる。パネルの Esc（document の keydown）まで伝えない。
      // Next.js は React のルートを document に置くため、React のハンドラと同じ document に登録された
      // パネルのリスナーは stopPropagation では止まらない。stopImmediatePropagation で後続のリスナーを止める
      // （React のリスナーのほうが先に登録されているので、パネルより先に実行される）
      event.nativeEvent.stopImmediatePropagation()
      close()
    },
    [isOpen, close],
  )

  const handleSelect = useCallback(
    (date: Date) => {
      onChange(toDateString(date))
      close()
    },
    [onChange, close],
  )

  return {
    // 要素への参照
    rootRef,
    buttonRef,
    // 開閉
    isOpen,
    handleToggle,
    handleKeyDown,
    handleBlur,
    // ボタンの表示
    displayLabel:
      selectedDate === undefined
        ? "日付を選択"
        : format(selectedDate, DISPLAY_FORMAT, { locale: ja }),
    popoverClassName:
      align === "right"
        ? `${styles.popover} ${styles.popoverRight}`
        : (styles.popover ?? ""),
    // カレンダー
    selectedDate,
    locale: ja,
    handleSelect,
    modifiers: {
      saturday: { dayOfWeek: [SATURDAY] },
      // 日曜と祝日は同じ赤。祝日が土曜と重なるときは祝日を優先するため、祝日の判定を別に持つ
      sunday: { dayOfWeek: [SUNDAY] },
      holiday: isHolidayDate,
    },
    modifiersClassNames: {
      saturday: styles.saturday ?? "",
      sunday: styles.holiday ?? "",
      holiday: styles.holiday ?? "",
    },
  }
}
