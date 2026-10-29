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
 */
export const CURRENT_SCHEMA_VERSION = 1

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

/** 初期表示の開始日を、今日の何日前にするか */
export const DEFAULT_RANGE_DAYS_BEFORE = 7

/** 初期表示の日数（約 2 か月分） */
export const DEFAULT_RANGE_DAYS = 60

/** 「前へ」「次へ」ボタン 1 回で表示期間を動かす日数 */
export const RANGE_SHIFT_DAYS = 14

/** 帯のドラッグで、これ未満の移動量（px）はクリックとみなす */
export const DRAG_THRESHOLD_PX = 4
