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
