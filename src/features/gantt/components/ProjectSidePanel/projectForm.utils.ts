import { format } from "date-fns"

import {
  DEFAULT_BAR_COLOR,
  PROJECT_NAME_MAX_LENGTH,
} from "../../gantt.constants"
import { isDateString } from "../../gantt.guards"
import type {
  IMember,
  IProject,
  TDateString,
  TProjectInput,
} from "../../gantt.type"
import type { IProjectFormValues, TProjectFormErrors } from "./projectForm.type"

/**
 * フォームの初期値を作る。編集のときは案件の内容、追加のときは今日の 1 日だけの案件にする。
 * 追加時の担当者は `defaultMemberId` を優先し、指定がなければ先頭の担当者にする。
 */
export function createInitialFormValues(
  members: IMember[],
  project: IProject | null,
  defaultMemberId: string | null,
  today: TDateString,
): IProjectFormValues {
  if (project !== null) {
    return {
      memberId: project.memberId,
      name: project.name,
      startDate: project.startDate,
      endDate: project.endDate,
      color: project.color,
      note: project.note,
    }
  }

  // 初期選択の担当者が存在しない（削除された等）ときは先頭に落とす
  const hasDefaultMember = members.some(
    (member) => member.id === defaultMemberId,
  )
  return {
    memberId: hasDefaultMember
      ? (defaultMemberId ?? "")
      : (members[0]?.id ?? ""),
    name: "",
    startDate: today,
    endDate: today,
    color: DEFAULT_BAR_COLOR,
    note: "",
  }
}

/**
 * フォームの入力値を検証し、項目ごとのエラーを返す（エラーがなければ空のオブジェクト）。
 * repository は名前の中身を見ないため、案件名の必須・文字数チェックはここが唯一の砦になる。
 */
export function validateProjectForm(
  values: IProjectFormValues,
  members: IMember[],
): TProjectFormErrors {
  const errors: TProjectFormErrors = {}

  // 空白だけの名前は未入力として扱う
  const name = values.name.trim()
  if (name === "") {
    errors.name = "案件名を入力してください"
  } else if (name.length > PROJECT_NAME_MAX_LENGTH) {
    errors.name = `案件名は ${PROJECT_NAME_MAX_LENGTH} 文字以内で入力してください`
  }

  // 担当者が他のタブで削除されている場合もあるため、存在も確かめる
  if (!members.some((member) => member.id === values.memberId)) {
    errors.memberId = "担当者を選択してください"
  }

  if (!isDateString(values.startDate)) {
    errors.startDate = "開始日を入力してください"
  }
  if (!isDateString(values.endDate)) {
    errors.endDate = "終了日を入力してください"
  } else if (
    isDateString(values.startDate) &&
    values.startDate > values.endDate
  ) {
    // "YYYY-MM-DD" は桁数が揃っているので、文字列の比較で日付の前後を判定できる
    errors.endDate = "終了日は開始日以降の日付にしてください"
  }

  return errors
}

/** 検証済みのフォームの入力値を、repository に渡す入力へ変換する（案件名の前後の空白は除く） */
export function toProjectInput(values: IProjectFormValues): TProjectInput {
  return {
    memberId: values.memberId,
    name: values.name.trim(),
    startDate: values.startDate,
    endDate: values.endDate,
    color: values.color,
    note: values.note,
  }
}

/**
 * 完了済みの案件の見出しに添える表示（例: "完了済み（10/30）"）を作る。
 * 完了日時（ISO 8601）は UTC で保存しているので、利用者の端末のタイムゾーンの日付で出す
 */
export function formatCompletedLabel(completedAt: string): string {
  return `完了済み（${format(new Date(completedAt), "M/d")}）`
}
