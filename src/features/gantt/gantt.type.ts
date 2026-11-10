/**
 * 日付を表す "YYYY-MM-DD" 形式の文字列（例: "2026-10-29"）。
 * 中身は string だが、日時（ISO 8601）と区別して意味を伝えるために別名を付けている。
 * タイムゾーンのずれを避けるため、日付は Date ではなくこの文字列で持つ。
 */
export type TDateString = string

/** 帯の色プリセットのキー。実際の色は `BAR_COLORS`（gantt.constants.ts）とデザイントークンで決まる */
export type TBarColor = "blue" | "green" | "orange" | "purple" | "red" | "gray"

/** 色プリセット 1 件分の定義 */
export interface IBarColorPreset {
  /** 画面に出す色の名前 */
  label: string
  /** 帯の背景に使う CSS カスタムプロパティ名（`src/styles/_tokens.scss` で定義） */
  cssVariable: string
}

/** 担当者（Firestore へ移行するときは members コレクションの 1 ドキュメントになる） */
export interface IMember {
  /** ドキュメント ID（crypto.randomUUID() で生成） */
  id: string
  name: string
  /** 左リストでの表示順（小さいほど上） */
  sortOrder: number
  /** 作成日時（ISO 8601） */
  createdAt: string
  /** 最終更新日時（ISO 8601） */
  updatedAt: string
}

/** 案件（Firestore へ移行するときは projects コレクションの 1 ドキュメントになる） */
export interface IProject {
  id: string
  /** 担当者の ID（IMember.id を参照する） */
  memberId: string
  name: string
  /** 開始日（この日を含む） */
  startDate: TDateString
  /** 終了日（この日を含む）。開始日以降であること */
  endDate: TDateString
  /** 帯の色 */
  color: TBarColor
  /** メモ（任意。未入力は空文字） */
  note: string
  /**
   * 担当者の中での表示順（小さいほど上）。値は担当者ごとに 0 から振る
   * （Firestore に移したときも、担当者で絞り込んで sortOrder で並べるだけで済むようにするため）
   */
  sortOrder: number
  /**
   * 完了にした日時（ISO 8601）。未完了は null。
   * 真偽値ではなく日時にしているのは、いつ完了したかを後から表示・並べ替えに使えるようにするため
   */
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

/**
 * サイドパネルの状態。編集中の案件そのものは持たず、`projectId` から案件の一覧を引いて求める
 * （保存や他の操作でデータが変わっても、パネルの表示とずれないようにするため）。
 */
export type TSidePanelState =
  | { mode: "closed" }
  /** 追加。`defaultMemberId` は担当者の初期選択（未指定は null） */
  | { mode: "create"; defaultMemberId: string | null }
  /** 編集 */
  | { mode: "edit"; projectId: string }

/** 担当者を作成するときの入力。id・sortOrder・日時は repository が付ける */
export type TMemberInput = Pick<IMember, "name">

/** 担当者を更新するときの入力。指定したフィールドだけを書き換える */
export type TMemberUpdate = Partial<TMemberInput>

/**
 * 案件を作成するときの入力。id・sortOrder・日時は repository が付ける。
 * 並び順を変えるのは `IGanttRepository.reorderProjects` だけにするため、更新の入力（TProjectUpdate）にも含めない。
 * 追加した案件は必ず未完了なので、completedAt も含めない
 */
export type TProjectInput = Omit<
  IProject,
  "id" | "sortOrder" | "completedAt" | "createdAt" | "updatedAt"
>

/**
 * 案件を更新するときの入力。指定したフィールドだけを書き換える（対象の id は別の引数で渡す）。
 * 完了の状態は日時ではなく `isCompleted` で指定する（日時を作るのは createdAt / updatedAt と同じく repository の責務）
 */
export type TProjectUpdate = Partial<TProjectInput> & {
  /** true で完了にする（すでに完了なら完了日時を変えない）、false で未完了に戻す。省略すると変えない */
  isCompleted?: boolean
}
