import { CURRENT_SCHEMA_VERSION, STORAGE_KEYS } from "../gantt.constants"
import {
  isDateString,
  isMember,
  isMemberList,
  isProject,
  isProjectList,
} from "../gantt.guards"
import type {
  IMember,
  IProject,
  TMemberInput,
  TMemberUpdate,
  TProjectInput,
  TProjectUpdate,
} from "../gantt.type"
import {
  GanttNotFoundError,
  GanttValidationError,
} from "./ganttRepository.errors"
import type { IGanttRepository } from "./ganttRepository.type"

/**
 * スキーマの移行処理。キーは「移行元のバージョン」で、その 1 つ上のバージョンへ書き換える。
 * MEMO: 構造を変えて CURRENT_SCHEMA_VERSION を 2 にしたら、ここに `1: (storage) => { ... }` を足す。
 * 今はバージョン 1 しかないので空。
 */
const SCHEMA_MIGRATIONS: Partial<Record<number, (storage: Storage) => void>> =
  {}

/** 現在日時を ISO 8601 の文字列で返す（createdAt / updatedAt 用） */
function getCurrentDateTime(): string {
  return new Date().toISOString()
}

/** 次に追加する担当者の sortOrder（今いる担当者の最大値 + 1。いなければ 0）を返す */
function getNextSortOrder(members: IMember[]): number {
  return members.reduce((max, member) => Math.max(max, member.sortOrder + 1), 0)
}

/**
 * 保存されているスキーマのバージョンを読む。
 * 未保存、または正の整数として読めない値のときは null を返す。
 */
function readSchemaVersion(storage: Storage): number | null {
  const raw = storage.getItem(STORAGE_KEYS.schemaVersion)
  if (raw === null) return null

  const version = Number(raw)
  return Number.isInteger(version) && version >= 1 ? version : null
}

/** 担当者を保存してよいか確かめる。不正なら GanttValidationError を投げる */
function validateMember(member: IMember): void {
  if (!isMember(member)) {
    throw new GanttValidationError("担当者の入力が不正です")
  }
}

/**
 * 案件を保存してよいか確かめる。不正なら GanttValidationError を投げる。
 * 画面に出しやすいよう、よくある誤り（日付）は個別のメッセージにしてから、残りを型ガードでまとめて確かめる。
 */
function validateProject(project: IProject): void {
  if (!isDateString(project.startDate) || !isDateString(project.endDate)) {
    throw new GanttValidationError(
      `日付は実在する "YYYY-MM-DD" 形式で指定してください（開始日: ${project.startDate}、終了日: ${project.endDate}）`,
    )
  }
  if (project.startDate > project.endDate) {
    throw new GanttValidationError("開始日は終了日以前の日付にしてください")
  }
  if (!isProject(project)) {
    throw new GanttValidationError("案件の入力が不正です")
  }
}

/**
 * localStorage に担当者・案件を保存する repository（MVP で使う実装）。
 *
 * - `gantt:members` / `gantt:projects` に配列を JSON で保存する（Firestore の 2 コレクションに対応）
 * - 読み込んだ値は型ガードで検証し、壊れていたら捨てて空配列から始める（コンソールに警告を出す）
 * - ブラウザ専用。サーバー側のレンダリング中には呼ばないこと（呼ぶとエラーになる）
 */
export class LocalStorageRepository implements IGanttRepository {
  /** コンストラクタで渡された Storage（テスト用）。未指定なら呼ばれた時点の window.localStorage を使う */
  private readonly injectedStorage: Storage | undefined
  /** スキーマのバージョン確認を済ませたか。毎回 localStorage を読み直さないためのフラグ */
  private isSchemaChecked = false

  /**
   * @param storage 保存先。省略すると window.localStorage を使う。
   *   サーバー側で生成だけされてもエラーにならないよう、window.localStorage は使う時点で取りにいく
   */
  constructor(storage?: Storage) {
    this.injectedStorage = storage
  }

  // ---- 担当者 ----

  async listMembers(): Promise<IMember[]> {
    return [...this.readMembers()].sort((a, b) => a.sortOrder - b.sortOrder)
  }

  async createMember(input: TMemberInput): Promise<IMember> {
    const members = this.readMembers()
    const timestamp = getCurrentDateTime()
    const member: IMember = {
      id: crypto.randomUUID(),
      name: input.name,
      sortOrder: getNextSortOrder(members),
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    validateMember(member)

    this.writeMembers([...members, member])
    return member
  }

  async updateMember(id: string, input: TMemberUpdate): Promise<IMember> {
    const members = this.readMembers()
    const current = members.find((member) => member.id === id)
    if (current === undefined) throw new GanttNotFoundError("member", id)

    // input に余計なキー（id など）が混ざっていても上書きされないよう、書き換えてよいフィールドだけを拾う
    const updated: IMember = {
      ...current,
      name: input.name ?? current.name,
      updatedAt: getCurrentDateTime(),
    }
    validateMember(updated)

    this.writeMembers(
      members.map((member) => (member.id === id ? updated : member)),
    )
    return updated
  }

  async reorderMembers(orderedIds: string[]): Promise<IMember[]> {
    const members = this.readMembers()
    const memberById = new Map(members.map((member) => [member.id, member]))

    if (new Set(orderedIds).size !== orderedIds.length) {
      throw new GanttValidationError("並び替えの id が重複しています")
    }

    // 渡された順に sortOrder を 0 から振り直す。順番が変わらない担当者は updatedAt も変えない
    const timestamp = getCurrentDateTime()
    const reordered = orderedIds.map((id, index) => {
      const member = memberById.get(id)
      if (member === undefined) throw new GanttNotFoundError("member", id)
      if (member.sortOrder === index) return member
      return { ...member, sortOrder: index, updatedAt: timestamp }
    })

    // 重複も未知の id もないので、件数が同じなら全員がちょうど 1 回ずつ含まれている
    if (reordered.length !== members.length) {
      throw new GanttValidationError(
        "並び替えには、すべての担当者の id を指定してください",
      )
    }

    this.writeMembers(reordered)
    return reordered
  }

  async deleteMember(id: string): Promise<void> {
    const members = this.readMembers()
    if (!members.some((member) => member.id === id)) {
      throw new GanttNotFoundError("member", id)
    }
    const projects = this.readProjects()

    // 案件を先に消す。2 回目の書き込みが失敗しても「案件のない担当者」が残るだけで、
    // 「担当者のいない案件」は生まれない（Firestore 版では batch 書き込みで 1 回にまとめる想定）
    this.writeProjects(projects.filter((project) => project.memberId !== id))
    this.writeMembers(members.filter((member) => member.id !== id))
  }

  // ---- 案件 ----

  async listProjects(): Promise<IProject[]> {
    return this.readProjects()
  }

  async createProject(input: TProjectInput): Promise<IProject> {
    this.assertMemberExists(input.memberId)

    const projects = this.readProjects()
    const timestamp = getCurrentDateTime()
    // input に余計なキーが混ざっていても保存しないよう、フィールドを 1 つずつ詰め直す
    const project: IProject = {
      id: crypto.randomUUID(),
      memberId: input.memberId,
      name: input.name,
      startDate: input.startDate,
      endDate: input.endDate,
      color: input.color,
      note: input.note,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    validateProject(project)

    this.writeProjects([...projects, project])
    return project
  }

  async updateProject(id: string, input: TProjectUpdate): Promise<IProject> {
    const projects = this.readProjects()
    const current = projects.find((project) => project.id === id)
    if (current === undefined) throw new GanttNotFoundError("project", id)

    // 指定されたフィールドだけを差し替える（undefined は「変更しない」として扱う）。
    // id と createdAt は input に混ざっていても変えない
    const updated: IProject = {
      id: current.id,
      memberId: input.memberId ?? current.memberId,
      name: input.name ?? current.name,
      startDate: input.startDate ?? current.startDate,
      endDate: input.endDate ?? current.endDate,
      color: input.color ?? current.color,
      note: input.note ?? current.note,
      createdAt: current.createdAt,
      updatedAt: getCurrentDateTime(),
    }
    if (updated.memberId !== current.memberId) {
      this.assertMemberExists(updated.memberId)
    }
    validateProject(updated)

    this.writeProjects(
      projects.map((project) => (project.id === id ? updated : project)),
    )
    return updated
  }

  async deleteProject(id: string): Promise<void> {
    const projects = this.readProjects()
    if (!projects.some((project) => project.id === id)) {
      throw new GanttNotFoundError("project", id)
    }

    this.writeProjects(projects.filter((project) => project.id !== id))
  }

  // ---- 内部処理 ----

  /** 担当者が存在しなければ GanttNotFoundError を投げる（案件の参照先の確認用） */
  private assertMemberExists(memberId: string): void {
    if (!this.readMembers().some((member) => member.id === memberId)) {
      throw new GanttNotFoundError("member", memberId)
    }
  }

  private readMembers(): IMember[] {
    return this.readList(STORAGE_KEYS.members, isMemberList)
  }

  private readProjects(): IProject[] {
    return this.readList(STORAGE_KEYS.projects, isProjectList)
  }

  private writeMembers(members: IMember[]): void {
    this.getPreparedStorage().setItem(
      STORAGE_KEYS.members,
      JSON.stringify(members),
    )
  }

  private writeProjects(projects: IProject[]): void {
    this.getPreparedStorage().setItem(
      STORAGE_KEYS.projects,
      JSON.stringify(projects),
    )
  }

  /**
   * 指定したキーの配列を読み、型ガードで検証して返す。
   * 未保存なら空配列。JSON として読めない・形が違うときも空配列にして、警告に元の値を残す
   * （次に書き込むと上書きされるため、手で復旧したいときはコンソールの値を使う）。
   */
  private readList<T>(
    key: string,
    guard: (value: unknown) => value is T[],
  ): T[] {
    const raw = this.getPreparedStorage().getItem(key)
    if (raw === null) return []

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      console.warn(
        `[gantt] ${key} を JSON として読めないため、空の状態から始めます`,
        raw,
      )
      return []
    }

    if (!guard(parsed)) {
      console.warn(
        `[gantt] ${key} のデータの形が不正なため、空の状態から始めます`,
        raw,
      )
      return []
    }
    return parsed
  }

  /** スキーマのバージョン確認（初回のみ）を済ませた Storage を返す。読み書きの前に必ずこれを通す */
  private getPreparedStorage(): Storage {
    const storage = this.getStorage()
    if (!this.isSchemaChecked) {
      this.migrateSchemaIfNeeded(storage)
      this.isSchemaChecked = true
    }
    return storage
  }

  /** 使う Storage を返す。window がない環境（サーバー側）ではエラーにする */
  private getStorage(): Storage {
    if (this.injectedStorage !== undefined) return this.injectedStorage
    if (typeof window === "undefined") {
      throw new Error(
        "LocalStorageRepository はブラウザでのみ使えます。サーバー側のレンダリング中に呼ばないでください",
      )
    }
    return window.localStorage
  }

  /**
   * 保存データのバージョンが古ければ移行し、現在のバージョンを書き込む。
   * - 未保存（初回）や読めない値: バージョン 1 より前の構造は存在しないので、現在のバージョンとみなす
   * - 新しいバージョン: 新しいアプリで保存されたデータ。書き換えると壊すおそれがあるので、警告だけ出して触らない
   */
  private migrateSchemaIfNeeded(storage: Storage): void {
    const version = readSchemaVersion(storage)
    if (version === CURRENT_SCHEMA_VERSION) return

    if (version !== null && version > CURRENT_SCHEMA_VERSION) {
      console.warn(
        `[gantt] 保存データのバージョン（${version}）がアプリの対応バージョン（${CURRENT_SCHEMA_VERSION}）より新しいため、移行せずに読み込みます`,
      )
      return
    }

    if (version !== null) {
      for (
        let fromVersion = version;
        fromVersion < CURRENT_SCHEMA_VERSION;
        fromVersion++
      ) {
        const migrate = SCHEMA_MIGRATIONS[fromVersion]
        if (migrate === undefined) {
          throw new Error(
            `[gantt] バージョン ${fromVersion} からの移行処理がありません（SCHEMA_MIGRATIONS に追加してください）`,
          )
        }
        migrate(storage)
      }
    }

    storage.setItem(STORAGE_KEYS.schemaVersion, String(CURRENT_SCHEMA_VERSION))
  }
}
