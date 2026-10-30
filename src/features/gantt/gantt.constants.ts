import type { IBarColorPreset, TBarColor } from "./gantt.type"

/** localStorage に保存するときのキー。Firestore へ移行したら使わなくなる */
export const STORAGE_KEYS = {
  /** 担当者の配列 */
  members: "gantt:members",
  /** 案件の配列 */
  projects: "gantt:projects",
  /** 保存データの構造のバージョン（数値の文字列） */
  schemaVersion: "gantt:schemaVersion",
} as const

/**
 * 保存データの構造の現在のバージョン。
 * IMember / IProject の構造を変えたときは 1 つ上げ、localStorageRepository に移行処理を足す。
 * - 1: 最初の構造
 * - 2: 案件に担当者の中での表示順（`IProject.sortOrder`）を追加
 */
export const CURRENT_SCHEMA_VERSION = 2

/**
 * 帯の色プリセット。キーの一覧は TBarColor と一致させる（Record で漏れを型チェックする）。
 * 色の値そのものはデザイントークン（_tokens.scss）に置き、ここでは CSS 変数名だけを持つ。
 */
export const BAR_COLORS: Record<TBarColor, IBarColorPreset> = {
  blue: { label: "青", cssVariable: "--color-bar-blue" },
  green: { label: "緑", cssVariable: "--color-bar-green" },
  orange: { label: "オレンジ", cssVariable: "--color-bar-orange" },
  purple: { label: "紫", cssVariable: "--color-bar-purple" },
  red: { label: "赤", cssVariable: "--color-bar-red" },
  gray: { label: "グレー", cssVariable: "--color-bar-gray" },
}

/** 案件を新しく作るときの帯の色 */
export const DEFAULT_BAR_COLOR: TBarColor = "blue"

/** 案件名の最大文字数 */
export const PROJECT_NAME_MAX_LENGTH = 100

/** 担当者名の最大文字数 */
export const MEMBER_NAME_MAX_LENGTH = 50

/** タイムラインの 1 日分の列幅（px） */
export const DAY_COLUMN_WIDTH = 32

/** 担当者行の高さ（px）。左リストとタイムラインで同じ値を使い、行をそろえる */
export const MEMBER_ROW_HEIGHT = 40

/** 案件行の高さ（px）。左リストとタイムラインで同じ値を使い、行をそろえる */
export const PROJECT_ROW_HEIGHT = 36

/** 左の担当者・案件リストの幅（px） */
export const MEMBER_LIST_WIDTH = 240

/** 日付ヘッダーの「月の行」の高さ（px） */
export const DATE_HEADER_MONTH_ROW_HEIGHT = 24

/** 日付ヘッダーの「日の行」の高さ（px） */
export const DATE_HEADER_DAY_ROW_HEIGHT = 28

/** 初期状態で、今日より前に用意しておく日数（左にスクロールできる余白になる） */
export const DEFAULT_RANGE_DAYS_BEFORE = 60

/** 初期状態で用意しておく合計の日数（今日より前の分を含む） */
export const DEFAULT_RANGE_DAYS = 180

/** 端に近づいたとき、表示期間を一度に延ばす日数 */
export const RANGE_EXTEND_DAYS = 90

/** スクロール位置が端からこの距離（px）より近づいたら、表示期間を延ばす */
export const RANGE_EDGE_THRESHOLD_PX = 640

/** 「前へ」「次へ」ボタン 1 回でスクロールする日数 */
export const RANGE_SHIFT_DAYS = 14

/** 初期表示と「今日」ボタンで、今日の列より左に見せておく日数 */
export const TODAY_SCROLL_MARGIN_DAYS = 7

/** 帯のドラッグで、これ未満の移動量（px）はクリックとみなす */
export const DRAG_THRESHOLD_PX = 4
