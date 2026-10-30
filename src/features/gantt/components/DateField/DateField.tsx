import { DayPicker } from "react-day-picker"
import "react-day-picker/style.css"

import type { TDateString } from "../../gantt.type"
import styles from "./DateField.module.scss"
import { useDateField } from "./useDateField"

interface IDateFieldProps {
  /** 入力欄の id。`label` の `htmlFor` と対応させる */
  id: string
  /** 選んでいる日付（"YYYY-MM-DD"）。読めない値のときは「日付を選択」と出す */
  value: string
  /** 日付が選ばれたときに呼ぶ */
  onChange: (value: TDateString) => void
  /** 検証エラーのときに枠を赤くする（button は aria-invalid を持てないので data 属性で表す） */
  isInvalid?: boolean
  /** カレンダーを出す向き。右端の欄は "right" にして、パネルの外にはみ出さないようにする */
  align?: "left" | "right"
}

/**
 * 日付の入力欄。押すとすぐ下にページのデザインに合わせたカレンダーを出す。
 * 値は "YYYY-MM-DD" の文字列で受け渡す（`Date` への変換は `useDateField` の中だけ）。
 * Esc はカレンダーだけを閉じ、サイドパネルまで閉じない。
 */
export function DateField({
  id,
  value,
  onChange,
  isInvalid = false,
  align = "left",
}: IDateFieldProps) {
  // lint の react-hooks/refs が、ref を含む戻り値の全体を「render 中に ref を読んでいる」と誤検知するため、先に分割代入する
  const {
    rootRef,
    buttonRef,
    isOpen,
    handleToggle,
    handleKeyDown,
    displayLabel,
    popoverClassName,
    selectedDate,
    locale,
    handleSelect,
    modifiers,
    modifiersClassNames,
  } = useDateField({ value, onChange, align })

  return (
    <div ref={rootRef} className={styles.root} onKeyDown={handleKeyDown}>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        className={styles.button}
        data-invalid={isInvalid}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={handleToggle}
      >
        {displayLabel}
      </button>
      {isOpen && (
        <div className={popoverClassName} role="dialog" aria-label="カレンダー">
          <DayPicker
            mode="single"
            required
            autoFocus
            locale={locale}
            weekStartsOn={0}
            defaultMonth={selectedDate}
            selected={selectedDate}
            onSelect={handleSelect}
            modifiers={modifiers}
            modifiersClassNames={modifiersClassNames}
          />
        </div>
      )}
    </div>
  )
}
