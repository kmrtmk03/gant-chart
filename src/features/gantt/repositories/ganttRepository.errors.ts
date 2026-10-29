/** 見つからなかったデータの種類 */
export type TGanttEntity = "member" | "project"

/** エラーメッセージに出すデータの種類の名前 */
const ENTITY_LABELS: Record<TGanttEntity, string> = {
  member: "担当者",
  project: "案件",
}

/**
 * 指定した id のデータが存在しないときに repository が投げるエラー。
 * 画面側では「ほかのタブで削除された」などの状況として、一覧を読み直すきっかけにする想定。
 */
export class GanttNotFoundError extends Error {
  /** 見つからなかったデータの種類 */
  readonly entity: TGanttEntity
  /** 見つからなかった id */
  readonly id: string

  constructor(entity: TGanttEntity, id: string) {
    super(`${ENTITY_LABELS[entity]}が見つかりません（id: ${id}）`)
    this.name = "GanttNotFoundError"
    this.entity = entity
    this.id = id
  }
}

/**
 * 入力がデータの整合性を壊すとき（開始日が終了日より後、実在しない日付など）に repository が投げるエラー。
 * 画面側でも同じ検証をするが、データを守る最後の砦として repository でも確かめる。
 */
export class GanttValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "GanttValidationError"
  }
}
