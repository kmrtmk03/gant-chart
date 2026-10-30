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
  GanttCorruptedDataError,
  GanttNotFoundError,
  GanttUnsupportedSchemaError,
  GanttValidationError,
} from "./ganttRepository.errors"
import type { IGanttRepository } from "./ganttRepository.type"
import {
  migrateSchemaV1ToV2,
  migrateSchemaV2ToV3,
} from "./localStorageMigrations"

/** Storage に書き込む 1 件分（キーと、書き込む文字列） */
interface IStorageEntry {
  key: string
  value: string
}

/** 操作前の Storage の値 1 件分。null は「そのキーは未保存だった」ことを表す */
interface IPreviousStorageEntry {
  key: string
  value: string | null
}

/**
 * スキーマの移行処理。キーは「移行元のバージョン」で、その 1 つ上のバージョンへ書き換える。
 * MEMO: 構造を変えて CURRENT_SCHEMA_VERSION を上げたら、ここに `{移行元}: (storage) => { ... }` を足す。
 * 移行処理の書き方の注意は localStorageMigrations.ts の先頭を参照
 */
const SCHEMA_MIGRATIONS: Partial<Record<number, (storage: Storage) => void>> = {
  1: migrateSchemaV1ToV2,
  2: migrateSchemaV2ToV3,
}

/**
 * 新しいデータの ID を作る。
 * MEMO: crypto.randomUUID() は安全なコンテキスト（HTTPS か localhost）でしか使えない。
 * `pnpm dev:http` に LAN の IP で接続する（スマホ実機での確認など）と undefined になり TypeError になる。
 * 本番（HTTPS）と localhost では問題ないので、今は対応しない。実機で確認するときは `pnpm dev`（HTTPS）を使う
 */
function generateId(): string {
  return crypto.randomUUID()
}

/** 控えておいた操作前の値に戻す。未保存だったキーは削除して、未保存の状態に戻す */
function restoreEntries(
  storage: Storage,
  previousEntries: IPreviousStorageEntry[],
): void {
  for (const entry of previousEntries) {
    if (entry.value === null) {
      storage.removeItem(entry.key)
    } else {
      storage.setItem(entry.key, entry.value)
    }
  }
}

/** 現在日時を ISO 8601 の文字列で返す（createdAt / updatedAt 用） */
function getCurrentDateTime(): string {
  return new Date().toISOString()
}

/**
 * 更新後の完了日時を決める。
 * - `isCompleted` が省略されたら今のまま
 * - true: 未完了なら今の日時を入れる。すでに完了していれば、最初に完了にした日時を変えない
 * - false: 未完了（null）に戻す
 */
function resolveCompletedAt(
  current: string | null,
  isCompleted: boolean | undefined,
  timestamp: string,
): string | null {
  if (isCompleted === undefined) return current
  if (!isCompleted) return null
  return current ?? timestamp
}

/**
 * 一番下に足すときの sortOrder（渡した一覧の最大値 + 1。空なら 0）を返す。
 * 担当者は全員を、案件は追加先の担当者の案件だけを渡す
 */
function getNextSortOrder(items: { sortOrder: number }[]): number {
  return items.reduce((max, item) => Math.max(max, item.sortOrder + 1), 0)
}

/** 指定した担当者の案件だけを取り出す */
function filterProjectsOfMember(
  projects: IProject[],
  memberId: string,
): IProject[] {
  return projects.filter((project) => project.memberId === memberId)
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
 * - 読み込んだ値は型ガードで検証し、壊れていたら GanttCorruptedDataError を投げて読み書きを止める
 *   （空として扱うと、次の書き込みで正常な分も含めて上書きしてしまうため。元の値はコンソールに残す）
 * - ブラウザ専用。サーバー側のレンダリング中には呼ばないこと（呼ぶとエラーになる）
 */
export class LocalStorageRepository implements IGanttRepository {
  /** コンストラクタで渡された Storage（テスト用）。未指定なら呼ばれた時点の window.localStorage を使う */
  private readonly injectedStorage: Storage | undefined

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
      id: generateId(),
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

    // 担当者と案件の 2 つのキーを書き換える。途中で失敗したら両方を操作前に戻す
    // （Firestore 版では batch 書き込みで 1 回にまとめる想定）
    this.writeAllOrRestore([
      {
        key: STORAGE_KEYS.projects,
        value: JSON.stringify(
          projects.filter((project) => project.memberId !== id),
        ),
      },
      {
        key: STORAGE_KEYS.members,
        value: JSON.stringify(members.filter((member) => member.id !== id)),
      },
    ])
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
      id: generateId(),
      memberId: input.memberId,
      name: input.name,
      startDate: input.startDate,
      endDate: input.endDate,
      color: input.color,
      note: input.note,
      // 追加先の担当者の一番下に入れる
      sortOrder: getNextSortOrder(
        filterProjectsOfMember(projects, input.memberId),
      ),
      // 追加した案件は必ず未完了
      completedAt: null,
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
    // id・sortOrder・completedAt・createdAt は input に混ざっていても変えない（完了の状態は isCompleted で変える）
    const timestamp = getCurrentDateTime()
    const memberId = input.memberId ?? current.memberId
    const isMemberChanged = memberId !== current.memberId
    if (isMemberChanged) this.assertMemberExists(memberId)
    const updated: IProject = {
      id: current.id,
      memberId,
      name: input.name ?? current.name,
      startDate: input.startDate ?? current.startDate,
      endDate: input.endDate ?? current.endDate,
      color: input.color ?? current.color,
      note: input.note ?? current.note,
      // 担当者を付け替えたときは、付け替え先の一番下に入れる。
      // 付け替え元に残った案件の sortOrder は詰め直さない（飛び番があっても並びは変わらないため）
      sortOrder: isMemberChanged
        ? getNextSortOrder(filterProjectsOfMember(projects, memberId))
        : current.sortOrder,
      completedAt: resolveCompletedAt(
        current.completedAt,
        input.isCompleted,
        timestamp,
      ),
      createdAt: current.createdAt,
      updatedAt: timestamp,
    }
    validateProject(updated)

    this.writeProjects(
      projects.map((project) => (project.id === id ? updated : project)),
    )
    return updated
  }

  async reorderProjects(
    memberId: string,
    orderedIds: string[],
  ): Promise<IProject[]> {
    this.assertMemberExists(memberId)
    const projects = this.readProjects()
    // 並び替えの対象は指定した担当者の案件だけ。別の担当者の案件の id は「存在しない」として扱う
    const projectById = new Map(
      filterProjectsOfMember(projects, memberId).map((project) => [
        project.id,
        project,
      ]),
    )

    if (new Set(orderedIds).size !== orderedIds.length) {
      throw new GanttValidationError("並び替えの id が重複しています")
    }

    // 渡された順に sortOrder を 0 から振り直す。順番が変わらない案件は updatedAt も変えない
    const timestamp = getCurrentDateTime()
    const reordered = orderedIds.map((id, index) => {
      const project = projectById.get(id)
      if (project === undefined) {
        throw new GanttValidationError(
          `並び替えの id に、この担当者の案件ではない id が含まれています（${id}）`,
        )
      }
      if (project.sortOrder === index) return project
      return { ...project, sortOrder: index, updatedAt: timestamp }
    })

    // 重複も余計な id もないので、件数が同じならその担当者の案件がちょうど 1 回ずつ含まれている
    if (reordered.length !== projectById.size) {
      throw new GanttValidationError(
        "並び替えには、その担当者のすべての案件の id を指定してください",
      )
    }

    // 保存順（配列の並び）は変えず、並び替えた案件だけを差し替える
    const reorderedById = new Map(
      reordered.map((project) => [project.id, project]),
    )
    this.writeProjects(
      projects.map((project) => reorderedById.get(project.id) ?? project),
    )
    return reordered
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
   * 複数のキーを順に書き込む。途中で失敗したら、書き込み済みのキーを操作前の値に戻してからエラーを投げ直す。
   * localStorage には複数のキーをまとめて書くトランザクションがないため、
   * 「一部だけ書き換わって、再試行しても元に戻せない」状態を作らないようにする。
   */
  private writeAllOrRestore(entries: IStorageEntry[]): void {
    const storage = this.getPreparedStorage()
    // 戻すときのために、操作前の値を先に控えておく（未保存だったキーは null）
    const previousEntries = entries.map((entry) => ({
      key: entry.key,
      value: storage.getItem(entry.key),
    }))

    let writtenCount = 0
    try {
      for (const entry of entries) {
        storage.setItem(entry.key, entry.value)
        writtenCount++
      }
    } catch (error) {
      // setItem は失敗したキーを書き換えないので、戻すのは書き込みに成功したキーだけでよい
      try {
        restoreEntries(storage, previousEntries.slice(0, writtenCount))
      } catch (restoreError) {
        throw new AggregateError(
          [error, restoreError],
          "[gantt] 書き込みに失敗し、操作前の値への復元にも失敗しました",
        )
      }
      throw error
    }
  }

  /**
   * 指定したキーの配列を読み、型ガードで検証して返す。
   * 未保存なら空配列。JSON として読めない・形が違う（不正な要素が 1 件でもある）ときは、
   * 空として扱わず GanttCorruptedDataError を投げる（空として続けると、次の書き込みで元のデータを上書きするため）。
   * 手で復旧できるよう、元の値をコンソールに残す。
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
      console.warn(`[gantt] ${key} を JSON として読めません`, raw)
      throw new GanttCorruptedDataError(key, "JSON として読めない")
    }

    if (!guard(parsed)) {
      console.warn(`[gantt] ${key} のデータの形が不正です`, raw)
      throw new GanttCorruptedDataError(key, "不正な形のデータを含んでいる")
    }
    return parsed
  }

  /**
   * スキーマのバージョンを確認した Storage を返す。読み書きの前に必ずこれを通す。
   * 確認結果は覚えずに毎回確かめる。古いタブを開いたまま別のタブで新しいアプリがデータを移行したときに、
   * 古いタブからの読み書きを止めるため（バージョンを 1 つ読むだけなので負担は小さい）
   */
  private getPreparedStorage(): Storage {
    const storage = this.getStorage()
    this.migrateSchemaIfNeeded(storage)
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
   * - 移行できない（保存データが壊れている）: GanttCorruptedDataError を投げ、バージョンも進めない
   * - 新しいバージョン: 新しいアプリで保存されたデータ（古いアプリへのロールバック後など）。
   *   読めば型ガードに合わずに空として扱われ、次の書き込みで上書きしてしまうため、
   *   GanttUnsupportedSchemaError を投げて読み書きの両方を止め、元のデータを保つ
   */
  private migrateSchemaIfNeeded(storage: Storage): void {
    const version = readSchemaVersion(storage)
    if (version === CURRENT_SCHEMA_VERSION) return

    if (version !== null && version > CURRENT_SCHEMA_VERSION) {
      throw new GanttUnsupportedSchemaError(version, CURRENT_SCHEMA_VERSION)
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
        // 1 ステップ終えるごとにバージョンを進める。途中の移行が失敗しても、
        // 済んだ分を最初からやり直さない（移行済みのデータに前のバージョンの移行を当てないため）
        storage.setItem(STORAGE_KEYS.schemaVersion, String(fromVersion + 1))
      }
    }

    storage.setItem(STORAGE_KEYS.schemaVersion, String(CURRENT_SCHEMA_VERSION))
  }
}
