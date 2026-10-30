import holiday_jp from "@holiday-jp/holiday_jp"
import {
  addDays as addDaysToDate,
  differenceInCalendarDays,
  format,
  getDay,
  parse,
} from "date-fns"

import { DAY_COLUMN_WIDTH, MEMBER_NAME_MAX_LENGTH } from "./gantt.constants"
import type { IMember, IProject, TDateString } from "./gantt.type"

// MEMO: 日付は "YYYY-MM-DD" の文字列で受け渡し、Date はこのファイルの関数の内側でだけ扱う。
// Date はローカル時刻で組み立てる（UTC だと日本時間の早朝に日付がずれるため）。
// 日数の計算には「カレンダー上の日数差」を使い、夏時間など 24 時間でない日があっても 1 日ずれないようにする。

/** 日付文字列の形式（date-fns の書式） */
const DATE_FORMAT = "yyyy-MM-dd"

/** 日曜（0）と土曜（6）。`getDay` の戻り値に対応する */
const WEEKEND_DAYS: readonly number[] = [0, 6]

/** 祝日の定義（日付 → 祝日名）。ライブラリの型はキーが日付リテラルの集合なので、文字列で引ける型に広げる */
const HOLIDAYS: Readonly<Record<string, { name: string } | undefined>> =
  holiday_jp.holidays

/** 帯の左右どちらの端を動かすか */
export type TBarEdge = "start" | "end"

/** 帯の描画位置。`getBarLayout` の戻り値 */
export interface IBarLayout {
  /** 表示期間の左端からの距離（px） */
  left: number
  /** 帯の幅（px）。表示期間からはみ出す部分は含めない */
  width: number
  /** 開始日が表示期間より前で、左側が切れているか */
  isClippedStart: boolean
  /** 終了日が表示期間より後で、右側が切れているか */
  isClippedEnd: boolean
}

/** 案件の期間（開始日・終了日）だけを取り出した型。移動・伸縮の計算結果にも使う */
export type TProjectPeriod = Pick<IProject, "startDate" | "endDate">

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

/** 担当者と、その配下の案件のまとまり。左リストとタイムラインが同じ並びで描くために使う */
export interface IMemberGroup {
  member: IMember
  /** 表示順（sortOrder の昇順。同じなら開始日順 → id 順）に並んだ案件 */
  projects: IProject[]
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

/**
 * 担当者ごとに案件をまとめる。担当者の並びは渡した順のまま、案件は表示順（sortOrder の昇順）に並べる。
 * sortOrder が同じ案件（別のタブで同時に追加したときなど）は、開始日順 → id 順にして並びを 1 つに決める。
 * 担当者が見つからない案件（memberId が不正）は、どの担当者にも属さないので含めない。
 */
export function groupProjectsByMember(
  members: IMember[],
  projects: IProject[],
): IMemberGroup[] {
  return members.map((member) => ({
    member,
    projects: projects
      .filter((project) => project.memberId === member.id)
      .sort(
        (a, b) =>
          a.sortOrder - b.sortOrder ||
          a.startDate.localeCompare(b.startDate) ||
          a.id.localeCompare(b.id),
      ),
  }))
}

/** 土曜・日曜か */
export function isWeekend(value: TDateString): boolean {
  return WEEKEND_DAYS.includes(getDay(parseDateString(value)))
}

/** 祝日（振替休日・国民の休日を含む）なら祝日名、そうでなければ null */
export function getHolidayName(value: TDateString): string | null {
  return HOLIDAYS[value]?.name ?? null
}

/** 祝日か */
export function isHoliday(value: TDateString): boolean {
  return getHolidayName(value) !== null
}

/**
 * 案件の期間が表示期間と 1 日でも重なるか。両方とも端の日を含む。
 * "YYYY-MM-DD" は文字列のまま大小比較しても日付順になる。
 */
export function isRangeOverlapping(
  projectStart: TDateString,
  projectEnd: TDateString,
  rangeStart: TDateString,
  rangeEnd: TDateString,
): boolean {
  return projectStart <= rangeEnd && projectEnd >= rangeStart
}

/**
 * 帯の位置と幅を求める。表示期間からはみ出す部分は切り詰め、どちら側が切れたかも返す。
 * 表示期間にまったく入らない案件は null（帯を描かない）。
 *
 * @param rangeStart 表示期間の最初の日
 * @param rangeDays 表示期間の日数
 */
export function getBarLayout(
  project: TProjectPeriod,
  rangeStart: TDateString,
  rangeDays: number,
): IBarLayout | null {
  // 表示期間の先頭を 0 とした、開始日・終了日の列番号
  const startIndex = diffInDays(rangeStart, project.startDate)
  const endIndex = diffInDays(rangeStart, project.endDate)

  // 表示期間内に収まる列の範囲（両端を含む）
  const visibleStartIndex = Math.max(startIndex, 0)
  const visibleEndIndex = Math.min(endIndex, rangeDays - 1)
  if (visibleStartIndex > visibleEndIndex) return null

  return {
    left: visibleStartIndex * DAY_COLUMN_WIDTH,
    width: (visibleEndIndex - visibleStartIndex + 1) * DAY_COLUMN_WIDTH,
    isClippedStart: startIndex < 0,
    isClippedEnd: endIndex > rangeDays - 1,
  }
}

/**
 * 今日の列の左端の位置（px）。表示期間の外なら null（線を描かない）。
 * 線を列の中央に引きたいときは、呼び出し側で `DAY_COLUMN_WIDTH / 2` を足す。
 *
 * @param today テスト用。省略すると実際の今日を使う
 */
export function getTodayOffset(
  rangeStart: TDateString,
  rangeDays: number,
  today: TDateString = getToday(),
): number | null {
  const index = diffInDays(rangeStart, today)
  if (index < 0 || index >= rangeDays) return null
  return index * DAY_COLUMN_WIDTH
}

/**
 * ドラッグの移動量（px）を日数に変換する。列幅の半分以上動いたら 1 日動いたとみなす。
 * ちょうど半分のときは、左右どちらでも絶対値が大きい側（0 から遠い側）にそろえる。
 */
export function pxToDays(deltaPx: number): number {
  const days = Math.round(Math.abs(deltaPx) / DAY_COLUMN_WIDTH)
  // Math.sign(0) * 0 や -0 を避けるため、0 のときは 0 を返す
  return days === 0 ? 0 : Math.sign(deltaPx) * days
}

/** 期間の長さを保ったまま `days` 日動かした後の開始日・終了日 */
export function moveProjectDates(
  project: TProjectPeriod,
  days: number,
): TProjectPeriod {
  return {
    startDate: addDays(project.startDate, days),
    endDate: addDays(project.endDate, days),
  }
}

/**
 * 帯の片端を `days` 日動かした後の開始日・終了日。
 * 反対側の端は動かさず、開始日 ≦ 終了日（最短 1 日）を保つ。追い越しそうなときは反対側の端で止める。
 */
export function resizeProjectDates(
  project: TProjectPeriod,
  edge: TBarEdge,
  days: number,
): TProjectPeriod {
  if (edge === "start") {
    const movedStart = addDays(project.startDate, days)
    return {
      startDate: movedStart > project.endDate ? project.endDate : movedStart,
      endDate: project.endDate,
    }
  }

  const movedEnd = addDays(project.endDate, days)
  return {
    startDate: project.startDate,
    endDate: movedEnd < project.startDate ? project.startDate : movedEnd,
  }
}

/** catch で受けた unknown を Error にそろえる（Error 以外が投げられたときは文字列化して包む） */
export function toError(caught: unknown): Error {
  return caught instanceof Error ? caught : new Error(String(caught))
}

/**
 * 担当者名を検証し、問題があればエラーメッセージ、なければ null を返す。
 * repository は名前の中身を見ないため、必須・文字数のチェックは画面側（これ）が唯一の砦になる。
 * 前後の空白は除いて判定するので、呼び出し側も保存する値は `trim()` したものにすること。
 * MEMO: 文字数は UTF-16 のコード単位（`length`）で数える。絵文字などは 2 文字ぶんになるが、身内利用なので許容している
 * （案件名の検証 `validateProjectForm` も同じ数え方）。
 */
export function validateMemberName(name: string): string | null {
  const trimmed = name.trim()
  if (trimmed === "") return "担当者名を入力してください"
  if (trimmed.length > MEMBER_NAME_MAX_LENGTH) {
    return `担当者名は ${MEMBER_NAME_MAX_LENGTH} 文字以内で入力してください`
  }
  return null
}

/**
 * 同じ名前の担当者がすでにいるか。同姓の人がいる場合を考えて登録は許すため、警告の表示にだけ使う。
 * `excludeMemberId` に名前変更中の担当者を渡すと、自分自身は数えない。前後の空白は除いて比べる。
 */
export function hasSameNameMember(
  name: string,
  members: IMember[],
  excludeMemberId: string | null = null,
): boolean {
  const trimmed = name.trim()
  if (trimmed === "") return false
  return members.some(
    (member) => member.id !== excludeMemberId && member.name === trimmed,
  )
}

/**
 * id の並びのうち `id` を `toIndex` 番目へ動かした新しい並びを返す（ドラッグによる並び替え用）。
 * `toIndex` は 0 〜 件数 - 1 に収める。`id` が含まれないときは null（元の配列は変更しない）。
 */
export function moveIdToIndex(
  ids: string[],
  id: string,
  toIndex: number,
): string[] | null {
  const fromIndex = ids.indexOf(id)
  if (fromIndex === -1) return null
  const clampedIndex = Math.min(Math.max(toIndex, 0), ids.length - 1)
  const moved = ids.filter((_, index) => index !== fromIndex)
  moved.splice(clampedIndex, 0, id)
  return moved
}
