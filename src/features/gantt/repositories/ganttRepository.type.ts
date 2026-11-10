import type {
  IMember,
  IProject,
  TMemberInput,
  TMemberUpdate,
  TProjectInput,
  TProjectUpdate,
} from "../gantt.type"

/**
 * ガントチャートのデータ（担当者・案件）を読み書きする窓口。
 * コンポーネントやフックは localStorage や Firestore を直接触らず、必ずこのインターフェースを経由する。
 *
 * - localStorage は同期処理だが、Firestore 版（API 経由）に差し替えても呼び出し側を変えずに済むよう、
 *   すべてのメソッドが Promise を返す
 * - 存在しない id を指定したときは GanttNotFoundError を投げる
 * - 入力が不正なとき（開始日が終了日より後など）は GanttValidationError を投げる
 * - 保存データがアプリより新しい構造のときは、すべてのメソッドが GanttUnsupportedSchemaError を投げる
 * - 保存データが壊れていて読めないときは、空として扱わず GanttCorruptedDataError を投げる（上書きを防ぐため）
 */
export interface IGanttRepository {
  /** 担当者の一覧を sortOrder の昇順で返す */
  listMembers(): Promise<IMember[]>
  /** 担当者を追加する。表示順は一番下になる */
  createMember(input: TMemberInput): Promise<IMember>
  /** 担当者の情報を書き換える */
  updateMember(id: string, input: TMemberUpdate): Promise<IMember>
  /**
   * 担当者の表示順を、渡した id の並びのとおりに付け直す。
   * orderedIds には全担当者の id を過不足なく 1 回ずつ含めること。
   * 戻り値は並び替え後の一覧（sortOrder の昇順）
   */
  reorderMembers(orderedIds: string[]): Promise<IMember[]>
  /** 担当者を削除する。配下の案件もまとめて削除する */
  deleteMember(id: string): Promise<void>

  /** 案件の一覧を返す（並び順は保存順。担当者の中での表示順は sortOrder を見て画面側で並べる） */
  listProjects(): Promise<IProject[]>
  /**
   * 案件を追加する。表示順は担当者の中の一番下になる。
   * memberId の担当者が存在しなければ GanttNotFoundError
   */
  createProject(input: TProjectInput): Promise<IProject>
  /**
   * 案件の情報を書き換える。担当者を付け替えるときも、付け替え先が存在する必要がある。
   * 担当者を付け替えたときは、付け替え先の一番下になる。
   * `input.isCompleted` で完了・未完了を切り替える（完了日時は repository が付ける。すでに完了なら変えない）
   */
  updateProject(id: string, input: TProjectUpdate): Promise<IProject>
  /**
   * 担当者の中の案件の表示順を、渡した id の並びのとおりに付け直す。
   * orderedIds にはその担当者の案件の id を過不足なく 1 回ずつ含めること（足りない・余計な id があれば GanttValidationError）。
   * 担当者が存在しなければ GanttNotFoundError。
   * 戻り値は並び替え後のその担当者の案件（sortOrder の昇順）
   */
  reorderProjects(memberId: string, orderedIds: string[]): Promise<IProject[]>
  /** 案件を削除する */
  deleteProject(id: string): Promise<void>
}
