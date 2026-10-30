import { BAR_COLORS } from "./gantt.constants"
import type { IMember, IProject, TBarColor, TDateString } from "./gantt.type"

// MEMO: このファイルの型ガードは、localStorage（将来は API のレスポンス）から読んだ値を検証するためのもの。
// localStorage は開発者ツールで手で書き換えられたり、古い構造のデータが残ったりするので、
// JSON.parse した値をそのまま信用せず、ここで形と中身を確かめてから使う。

/** "YYYY-MM-DD" の形式（数字の桁数）だけを確かめる正規表現 */
const DATE_STRING_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

/** プロパティを読める「null でないオブジェクト」かを確かめる（配列も除く） */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/** 空でない文字列かを確かめる。ID が空だと参照（memberId）が成り立たないため */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0
}

/**
 * 案件の表示順（0 以上の整数）かを確かめる。
 * 担当者ごとに 0 から振る値なので、負の数・小数・NaN は並び替えの計算（id の並びの添字）と合わなくなるため弾く
 */
function isProjectSortOrder(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
}

/**
 * 日時（ISO 8601 の文字列）として読めるかを確かめる。
 * 並び替えや表示で Date に変換することがあるため、変換できない文字列は弾く。
 */
function isDateTimeString(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value))
}

/**
 * "YYYY-MM-DD" 形式で、かつ実在する日付かを確かめる。
 * 形式だけだと "2026-02-30" や "2026-13-01" も通ってしまい、日付計算がずれるため、
 * UTC の Date に組み立て直して年・月・日がそのまま戻るかで実在を確認する。
 */
export function isDateString(value: unknown): value is TDateString {
  if (typeof value !== "string") return false

  const match = DATE_STRING_PATTERN.exec(value)
  if (match === null) return false

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))

  // 存在しない日付は翌月などに繰り上がるので、組み立て前と値が変わる
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

/**
 * 色プリセットのキーかを確かめる。
 * プリセットを減らしたり名前を変えたりした後に古いキーが残っていると、帯の色を決められないため。
 */
export function isBarColor(value: unknown): value is TBarColor {
  return typeof value === "string" && Object.hasOwn(BAR_COLORS, value)
}

/** 担当者（IMember）の形をしているかを確かめる */
export function isMember(value: unknown): value is IMember {
  if (!isRecord(value)) return false

  return (
    isNonEmptyString(value.id) &&
    typeof value.name === "string" &&
    // NaN や Infinity だと並び順が決まらないため、有限の数値に限る
    typeof value.sortOrder === "number" &&
    Number.isFinite(value.sortOrder) &&
    isDateTimeString(value.createdAt) &&
    isDateTimeString(value.updatedAt)
  )
}

/**
 * 案件（IProject）の形をしているかを確かめる。
 * 開始日が終了日より後だと帯の幅が負になって描画が壊れるため、日付の前後関係も確かめる。
 */
export function isProject(value: unknown): value is IProject {
  if (!isRecord(value)) return false

  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.memberId) &&
    typeof value.name === "string" &&
    isDateString(value.startDate) &&
    isDateString(value.endDate) &&
    // "YYYY-MM-DD" は桁数が揃っているので、文字列の比較で日付の前後を判定できる
    value.startDate <= value.endDate &&
    isBarColor(value.color) &&
    typeof value.note === "string" &&
    isProjectSortOrder(value.sortOrder) &&
    isDateTimeString(value.createdAt) &&
    isDateTimeString(value.updatedAt)
  )
}

/** 担当者の配列かを確かめる。要素が 1 つでも不正なら false */
export function isMemberList(value: unknown): value is IMember[] {
  return Array.isArray(value) && value.every(isMember)
}

/** 案件の配列かを確かめる。要素が 1 つでも不正なら false */
export function isProjectList(value: unknown): value is IProject[] {
  return Array.isArray(value) && value.every(isProject)
}
