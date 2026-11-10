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

/**
 * 保存データのスキーマが、アプリの対応バージョンより新しいときに repository が投げるエラー。
 * 新しいアプリで保存したデータを古いアプリ（ロールバック後など）で読み書きすると、
 * 型ガードに合わずに空として扱われ、次の書き込みで上書きしてしまう。それを防ぐため、読み書きの両方を止める。
 * 画面側では「アプリを最新にしてください」と案内する想定。
 */
export class GanttUnsupportedSchemaError extends Error {
  /** 保存データのバージョン */
  readonly storedVersion: number
  /** アプリが対応しているバージョン */
  readonly supportedVersion: number

  constructor(storedVersion: number, supportedVersion: number) {
    super(
      `保存データのバージョン（${storedVersion}）がアプリの対応バージョン（${supportedVersion}）より新しいため、読み書きできません`,
    )
    this.name = "GanttUnsupportedSchemaError"
    this.storedVersion = storedVersion
    this.supportedVersion = supportedVersion
  }
}

/**
 * 保存データが壊れていて読めないとき（JSON として読めない・形が不正・移行できない）に repository が投げるエラー。
 * 空として扱って続けると、次の書き込みで元のデータを上書きして失われるため、読み書きの両方を止める。
 * 画面側では読み込み失敗として知らせ、元のデータは保存先に残したままにする。
 */
export class GanttCorruptedDataError extends Error {
  /** 壊れていた保存先のキー */
  readonly key: string

  constructor(key: string, reason: string) {
    super(
      `保存データ（${key}）が${reason}ため、読み書きを止めました。元のデータは消していません。ブラウザの開発者ツールで localStorage の値を確認して復旧してください`,
    )
    this.name = "GanttCorruptedDataError"
    this.key = key
  }
}
