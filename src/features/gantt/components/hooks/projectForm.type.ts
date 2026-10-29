import type { TBarColor } from "../../gantt.type"

/**
 * サイドパネルのフォームの入力値。`input` の value は文字列で扱うため、日付も空文字を取りうる。
 * 保存するときは `toProjectInput` で `TProjectInput` に変換する。
 */
export interface IProjectFormValues {
  /** 担当者の ID（未選択は空文字） */
  memberId: string
  name: string
  /** "YYYY-MM-DD"（未入力は空文字） */
  startDate: string
  /** "YYYY-MM-DD"（未入力は空文字） */
  endDate: string
  color: TBarColor
  note: string
}

/** 項目ごとのエラーメッセージ。エラーのない項目はキーを持たない */
export type TProjectFormErrors = Partial<
  Record<keyof IProjectFormValues, string>
>
