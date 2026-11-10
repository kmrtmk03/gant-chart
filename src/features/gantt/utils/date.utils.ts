import holiday_jp from "@holiday-jp/holiday_jp"
import {
  addDays as addDaysToDate,
  differenceInCalendarDays,
  format,
  getDay,
  parse,
} from "date-fns"

import type { TDateString } from "../gantt.type"

// MEMO: 日付は "YYYY-MM-DD" の文字列で受け渡し、Date はこのファイルの関数の内側でだけ扱う。
// Date はローカル時刻で組み立てる（UTC だと日本時間の早朝に日付がずれるため）。
// 日数の計算には「カレンダー上の日数差」を使い、夏時間など 24 時間でない日があっても 1 日ずれないようにする。

/** 日付文字列の形式（date-fns の書式） */
const DATE_FORMAT = "yyyy-MM-dd"

/** 日曜（0）と土曜（6）。`getDay` の戻り値に対応する */
const WEEKEND_DAYS: readonly number[] = [0, 6]
/** 土曜（`getDay` の戻り値） */
const SATURDAY = 6

/** 祝日の定義（日付 → 祝日名）。ライブラリの型はキーが日付リテラルの集合なので、文字列で引ける型に広げる */
const HOLIDAYS: Readonly<Record<string, { name: string } | undefined>> =
  holiday_jp.holidays

/** Date を "YYYY-MM-DD" の文字列に変換する（ローカル時刻の年月日を使う） */
export function toDateString(date: Date): TDateString {
  return format(date, DATE_FORMAT)
}

/**
 * "YYYY-MM-DD" の文字列を、その日のローカル 0 時の Date に変換する。
 * 呼び出し側で型ガード（isDateString）を通した値だけを渡すこと。
 * date-fns の parse は "2026-1-5" のような 1 桁の月日も受け付けるため、
 * 変換結果を文字列に戻して元と一致するかを確かめ、厳密な形式以外は RangeError を投げる。
 */
export function parseDateString(value: TDateString): Date {
  const date = parse(value, DATE_FORMAT, new Date())
  if (Number.isNaN(date.getTime()) || toDateString(date) !== value) {
    throw new RangeError(`日付として読めない値です: ${value}`)
  }
  return date
}

/** 今日の日付を返す */
export function getToday(): TDateString {
  return toDateString(new Date())
}

/** 日付に日数を足す（マイナスで引く） */
export function addDays(value: TDateString, days: number): TDateString {
  return toDateString(addDaysToDate(parseDateString(value), days))
}

/** `to` が `from` の何日後か（`to` が前ならマイナス）。同じ日なら 0 */
export function diffInDays(from: TDateString, to: TDateString): number {
  return differenceInCalendarDays(parseDateString(to), parseDateString(from))
}

/** `start` から `days` 日分の日付の配列を返す。`days` が 0 以下なら空配列 */
export function getDateRange(start: TDateString, days: number): TDateString[] {
  return Array.from({ length: Math.max(days, 0) }, (_, index) =>
    addDays(start, index),
  )
}

/** タイムラインの 1 日分の列の情報。日付ヘッダーと背景の色分けに使う */
export interface IDayColumn {
  date: TDateString
  /** 土曜・日曜か */
  isWeekend: boolean
  /** 土曜か（土曜は青、日曜と祝日は赤で色分けするため、土日とは別に持つ） */
  isSaturday: boolean
  /** 月の 1 日か（月の区切りの線を引く列） */
  isMonthStart: boolean
  /** 祝日名。祝日でなければ null */
  holidayName: string | null
}

/** 日付ヘッダーの「月の行」の 1 区間（同じ月が続く列のまとまり） */
export interface IMonthSegment {
  /** "YYYY-MM"。React の key に使う */
  key: string
  /** 表示名（例: "2026年10月"） */
  label: string
  /** この月が表示期間の中で占める日数 */
  days: number
}

/** "YYYY-MM-DD" から "YYYY年M月" の表示名を作る */
export function formatYearMonth(value: TDateString): string {
  return `${value.slice(0, 4)}年${Number(value.slice(5, 7))}月`
}

/** `start` から `days` 日分の、色分けと日付ヘッダーに必要な情報を返す */
export function getDayColumns(start: TDateString, days: number): IDayColumn[] {
  return getDateRange(start, days).map((date) => ({
    date,
    isWeekend: isWeekend(date),
    isSaturday: isSaturday(date),
    isMonthStart: date.endsWith("-01"),
    holidayName: getHolidayName(date),
  }))
}

/** 日の列を、同じ月が続く区間にまとめる（日付ヘッダーの月の行用） */
export function getMonthSegments(columns: IDayColumn[]): IMonthSegment[] {
  const segments: IMonthSegment[] = []
  for (const { date } of columns) {
    const key = date.slice(0, 7)
    const last = segments.at(-1)
    if (last?.key === key) {
      last.days += 1
    } else {
      segments.push({ key, label: formatYearMonth(date), days: 1 })
    }
  }
  return segments
}

/** 土曜・日曜か */
export function isWeekend(value: TDateString): boolean {
  return WEEKEND_DAYS.includes(getDay(parseDateString(value)))
}

/** 土曜か */
export function isSaturday(value: TDateString): boolean {
  return getDay(parseDateString(value)) === SATURDAY
}

/** 祝日（振替休日・国民の休日を含む）なら祝日名、そうでなければ null */
export function getHolidayName(value: TDateString): string | null {
  return HOLIDAYS[value]?.name ?? null
}

/** 祝日か */
export function isHoliday(value: TDateString): boolean {
  return getHolidayName(value) !== null
}
