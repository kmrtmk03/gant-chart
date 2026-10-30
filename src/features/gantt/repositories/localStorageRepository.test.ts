import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { CURRENT_SCHEMA_VERSION, STORAGE_KEYS } from "../gantt.constants"
import type { TProjectInput } from "../gantt.type"
import {
  GanttNotFoundError,
  GanttUnsupportedSchemaError,
  GanttValidationError,
} from "./ganttRepository.errors"
import { LocalStorageRepository } from "./localStorageRepository"

/**
 * テスト用のメモリ上の Storage。window.localStorage の代わりに repository へ渡す。
 * Storage 型はインデックスシグネチャを持つため、クラス側にも宣言して代入できるようにしている。
 */
class MemoryStorage implements Storage {
  [key: string]: unknown
  private readonly items = new Map<string, string>()
  /**
   * true を返したキーの setItem を失敗させる（容量超過などの書き込み失敗の再現用）。
   * 本物の localStorage と同じく、失敗したときは値を書き換えない
   */
  shouldFailWrite: (key: string) => boolean = () => false

  get length(): number {
    return this.items.size
  }

  clear(): void {
    this.items.clear()
  }

  getItem(key: string): string | null {
    return this.items.get(key) ?? null
  }

  key(index: number): string | null {
    return [...this.items.keys()][index] ?? null
  }

  removeItem(key: string): void {
    this.items.delete(key)
  }

  setItem(key: string, value: string): void {
    if (this.shouldFailWrite(key)) {
      throw new Error(`${key} への書き込みに失敗しました（テスト用）`)
    }
    this.items.set(key, value)
  }
}

/** テストで使う日時（Date だけを偽装し、updatedAt の変化を確かめられるようにする） */
const CREATED_AT = new Date("2026-10-29T00:00:00.000Z")
const UPDATED_AT = new Date("2026-10-30T09:00:00.000Z")

/** 案件の入力のひな形（memberId はテストごとに差し替える） */
function buildProjectInput(memberId: string): TProjectInput {
  return {
    memberId,
    name: "案件A",
    startDate: "2026-10-01",
    endDate: "2026-10-31",
    color: "blue",
    note: "",
  }
}

let storage: MemoryStorage
let repository: LocalStorageRepository

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(CREATED_AT)
  storage = new MemoryStorage()
  repository = new LocalStorageRepository(storage)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe("担当者", () => {
  it("最初は空の一覧を返す", async () => {
    await expect(repository.listMembers()).resolves.toEqual([])
  })

  it("追加すると id・表示順・日時が付き、一覧に出る", async () => {
    const tanaka = await repository.createMember({ name: "田中" })
    const sato = await repository.createMember({ name: "佐藤" })

    expect(tanaka).toEqual({
      id: expect.any(String),
      name: "田中",
      sortOrder: 0,
      createdAt: CREATED_AT.toISOString(),
      updatedAt: CREATED_AT.toISOString(),
    })
    expect(sato.sortOrder).toBe(1)
    expect(sato.id).not.toBe(tanaka.id)
    await expect(repository.listMembers()).resolves.toEqual([tanaka, sato])
  })

  it("一覧は sortOrder の昇順で返す", async () => {
    const tanaka = await repository.createMember({ name: "田中" })
    const sato = await repository.createMember({ name: "佐藤" })
    await repository.reorderMembers([sato.id, tanaka.id])

    const names = (await repository.listMembers()).map((member) => member.name)
    expect(names).toEqual(["佐藤", "田中"])
  })

  it("名前を変更すると updatedAt だけが進む", async () => {
    const tanaka = await repository.createMember({ name: "田中" })
    vi.setSystemTime(UPDATED_AT)

    const updated = await repository.updateMember(tanaka.id, {
      name: "田中太郎",
    })

    expect(updated).toEqual({
      ...tanaka,
      name: "田中太郎",
      updatedAt: UPDATED_AT.toISOString(),
    })
    await expect(repository.listMembers()).resolves.toEqual([updated])
  })

  it("更新の入力に id が混ざっていても id は変わらない", async () => {
    const tanaka = await repository.createMember({ name: "田中" })
    const input = { name: "田中太郎", id: "別の id" }

    const updated = await repository.updateMember(tanaka.id, input)

    expect(updated.id).toBe(tanaka.id)
  })

  it("存在しない担当者を更新すると GanttNotFoundError", async () => {
    await expect(
      repository.updateMember("missing", { name: "x" }),
    ).rejects.toThrow(GanttNotFoundError)
  })

  it("削除すると一覧から消える", async () => {
    const tanaka = await repository.createMember({ name: "田中" })
    const sato = await repository.createMember({ name: "佐藤" })

    await repository.deleteMember(tanaka.id)

    await expect(repository.listMembers()).resolves.toEqual([sato])
  })

  it("担当者を削除すると、その担当者の案件だけがまとめて消える", async () => {
    const tanaka = await repository.createMember({ name: "田中" })
    const sato = await repository.createMember({ name: "佐藤" })
    await repository.createProject(buildProjectInput(tanaka.id))
    await repository.createProject(buildProjectInput(tanaka.id))
    const satoProject = await repository.createProject(
      buildProjectInput(sato.id),
    )

    await repository.deleteMember(tanaka.id)

    await expect(repository.listProjects()).resolves.toEqual([satoProject])
  })

  it("存在しない担当者を削除すると GanttNotFoundError", async () => {
    await expect(repository.deleteMember("missing")).rejects.toThrow(
      GanttNotFoundError,
    )
  })

  it("担当者の書き込みに失敗したら、先に消した案件も元に戻す", async () => {
    const tanaka = await repository.createMember({ name: "田中" })
    const project = await repository.createProject(buildProjectInput(tanaka.id))
    storage.shouldFailWrite = (key) => key === STORAGE_KEYS.members

    await expect(repository.deleteMember(tanaka.id)).rejects.toThrow(
      /書き込みに失敗/,
    )

    // 削除前のまま残っているので、再試行すれば削除できる
    await expect(repository.listMembers()).resolves.toEqual([tanaka])
    await expect(repository.listProjects()).resolves.toEqual([project])
    storage.shouldFailWrite = () => false
    await repository.deleteMember(tanaka.id)
    await expect(repository.listProjects()).resolves.toEqual([])
  })

  it("案件が未保存だった場合は、未保存の状態に戻す", async () => {
    const tanaka = await repository.createMember({ name: "田中" })
    storage.shouldFailWrite = (key) => key === STORAGE_KEYS.members

    await expect(repository.deleteMember(tanaka.id)).rejects.toThrow(
      /書き込みに失敗/,
    )

    expect(storage.getItem(STORAGE_KEYS.projects)).toBeNull()
  })

  it("元に戻す書き込みも失敗したら、両方のエラーをまとめて投げる", async () => {
    const tanaka = await repository.createMember({ name: "田中" })
    await repository.createProject(buildProjectInput(tanaka.id))
    // 案件は 1 回目（削除）だけ成功させ、2 回目（復元）を失敗させる
    let projectWriteCount = 0
    storage.shouldFailWrite = (key) => {
      if (key === STORAGE_KEYS.members) return true
      if (key !== STORAGE_KEYS.projects) return false
      projectWriteCount++
      return projectWriteCount >= 2
    }

    await expect(repository.deleteMember(tanaka.id)).rejects.toThrow(
      AggregateError,
    )
  })
})

describe("担当者の並び替え", () => {
  it("渡した順に sortOrder を振り直し、順番が変わった担当者だけ updatedAt を進める", async () => {
    const a = await repository.createMember({ name: "A" })
    const b = await repository.createMember({ name: "B" })
    const c = await repository.createMember({ name: "C" })
    vi.setSystemTime(UPDATED_AT)

    const reordered = await repository.reorderMembers([a.id, c.id, b.id])

    expect(reordered).toEqual([
      a,
      { ...c, sortOrder: 1, updatedAt: UPDATED_AT.toISOString() },
      { ...b, sortOrder: 2, updatedAt: UPDATED_AT.toISOString() },
    ])
    await expect(repository.listMembers()).resolves.toEqual(reordered)
  })

  it("担当者が 0 人なら空配列で並び替えられる", async () => {
    await expect(repository.reorderMembers([])).resolves.toEqual([])
  })

  it("id が重複していると GanttValidationError で、保存内容は変わらない", async () => {
    const a = await repository.createMember({ name: "A" })
    const b = await repository.createMember({ name: "B" })

    await expect(repository.reorderMembers([a.id, a.id, b.id])).rejects.toThrow(
      GanttValidationError,
    )
    await expect(repository.listMembers()).resolves.toEqual([a, b])
  })

  it("足りない id があると GanttValidationError", async () => {
    const a = await repository.createMember({ name: "A" })
    await repository.createMember({ name: "B" })

    await expect(repository.reorderMembers([a.id])).rejects.toThrow(
      GanttValidationError,
    )
  })

  it("存在しない id があると GanttNotFoundError", async () => {
    const a = await repository.createMember({ name: "A" })

    await expect(repository.reorderMembers([a.id, "missing"])).rejects.toThrow(
      GanttNotFoundError,
    )
  })
})

describe("案件", () => {
  it("追加すると id と日時が付き、一覧に出る", async () => {
    const tanaka = await repository.createMember({ name: "田中" })

    const project = await repository.createProject(buildProjectInput(tanaka.id))

    expect(project).toEqual({
      ...buildProjectInput(tanaka.id),
      id: expect.any(String),
      sortOrder: 0,
      completedAt: null,
      createdAt: CREATED_AT.toISOString(),
      updatedAt: CREATED_AT.toISOString(),
    })
    await expect(repository.listProjects()).resolves.toEqual([project])
  })

  it("追加した案件は、その担当者の一番下（担当者ごとの sortOrder の最大値 + 1）に入る", async () => {
    const tanaka = await repository.createMember({ name: "田中" })
    const sato = await repository.createMember({ name: "佐藤" })

    const first = await repository.createProject(buildProjectInput(tanaka.id))
    const second = await repository.createProject(buildProjectInput(tanaka.id))
    const other = await repository.createProject(buildProjectInput(sato.id))
    await repository.reorderProjects(tanaka.id, [second.id, first.id])
    const third = await repository.createProject(buildProjectInput(tanaka.id))

    expect(other.sortOrder).toBe(0)
    expect(third.sortOrder).toBe(2)
  })

  it("開始日と終了日が同じ日の案件を追加できる", async () => {
    const tanaka = await repository.createMember({ name: "田中" })
    const input = { ...buildProjectInput(tanaka.id), endDate: "2026-10-01" }

    await expect(repository.createProject(input)).resolves.toMatchObject(input)
  })

  it("存在しない担当者の案件は追加できない（GanttNotFoundError）", async () => {
    await expect(
      repository.createProject(buildProjectInput("missing")),
    ).rejects.toThrow(GanttNotFoundError)
  })

  it("開始日が終了日より後なら GanttValidationError で、保存されない", async () => {
    const tanaka = await repository.createMember({ name: "田中" })
    const input = {
      ...buildProjectInput(tanaka.id),
      startDate: "2026-11-01",
      endDate: "2026-10-31",
    }

    await expect(repository.createProject(input)).rejects.toThrow(
      GanttValidationError,
    )
    await expect(repository.listProjects()).resolves.toEqual([])
  })

  it("実在しない日付なら GanttValidationError", async () => {
    const tanaka = await repository.createMember({ name: "田中" })
    const input = { ...buildProjectInput(tanaka.id), endDate: "2026-02-30" }

    await expect(repository.createProject(input)).rejects.toThrow(
      GanttValidationError,
    )
  })

  it("指定したフィールドだけを更新し、updatedAt を進める", async () => {
    const tanaka = await repository.createMember({ name: "田中" })
    const project = await repository.createProject(buildProjectInput(tanaka.id))
    vi.setSystemTime(UPDATED_AT)

    const updated = await repository.updateProject(project.id, {
      endDate: "2026-11-15",
      note: "延長",
    })

    expect(updated).toEqual({
      ...project,
      endDate: "2026-11-15",
      note: "延長",
      updatedAt: UPDATED_AT.toISOString(),
    })
    await expect(repository.listProjects()).resolves.toEqual([updated])
  })

  it("undefined を渡したフィールドは変更しない", async () => {
    const tanaka = await repository.createMember({ name: "田中" })
    const project = await repository.createProject(buildProjectInput(tanaka.id))

    const updated = await repository.updateProject(project.id, {
      name: undefined,
    })

    expect(updated.name).toBe(project.name)
  })

  it("担当者を付け替えられる", async () => {
    const tanaka = await repository.createMember({ name: "田中" })
    const sato = await repository.createMember({ name: "佐藤" })
    const project = await repository.createProject(buildProjectInput(tanaka.id))

    const updated = await repository.updateProject(project.id, {
      memberId: sato.id,
    })

    expect(updated.memberId).toBe(sato.id)
  })

  it("担当者を付け替えると付け替え先の一番下に入り、付け替え元の案件の sortOrder は詰め直さない", async () => {
    const tanaka = await repository.createMember({ name: "田中" })
    const sato = await repository.createMember({ name: "佐藤" })
    const moving = await repository.createProject(buildProjectInput(tanaka.id))
    const staying = await repository.createProject(buildProjectInput(tanaka.id))
    await repository.createProject(buildProjectInput(sato.id))
    await repository.createProject(buildProjectInput(sato.id))

    const updated = await repository.updateProject(moving.id, {
      memberId: sato.id,
    })

    expect(updated.sortOrder).toBe(2)
    const projects = await repository.listProjects()
    expect(projects.find((project) => project.id === staying.id)).toEqual(
      staying,
    )
  })

  it("担当者を変えない更新では sortOrder を変えない（入力に混ざっていても無視する）", async () => {
    const tanaka = await repository.createMember({ name: "田中" })
    await repository.createProject(buildProjectInput(tanaka.id))
    const project = await repository.createProject(buildProjectInput(tanaka.id))

    const updated = await repository.updateProject(project.id, {
      memberId: tanaka.id,
      name: "改名",
      ...{ sortOrder: 99 },
    })

    expect(updated.sortOrder).toBe(1)
  })

  it("存在しない担当者へは付け替えられない（GanttNotFoundError）", async () => {
    const tanaka = await repository.createMember({ name: "田中" })
    const project = await repository.createProject(buildProjectInput(tanaka.id))

    await expect(
      repository.updateProject(project.id, { memberId: "missing" }),
    ).rejects.toThrow(GanttNotFoundError)
  })

  it("更新で開始日が終了日より後になると GanttValidationError で、保存内容は変わらない", async () => {
    const tanaka = await repository.createMember({ name: "田中" })
    const project = await repository.createProject(buildProjectInput(tanaka.id))

    await expect(
      repository.updateProject(project.id, { startDate: "2026-11-01" }),
    ).rejects.toThrow(GanttValidationError)
    await expect(repository.listProjects()).resolves.toEqual([project])
  })

  it("存在しない案件を更新すると GanttNotFoundError", async () => {
    await expect(
      repository.updateProject("missing", { name: "x" }),
    ).rejects.toThrow(GanttNotFoundError)
  })

  it("削除すると一覧から消える", async () => {
    const tanaka = await repository.createMember({ name: "田中" })
    const first = await repository.createProject(buildProjectInput(tanaka.id))
    const second = await repository.createProject(buildProjectInput(tanaka.id))

    await repository.deleteProject(first.id)

    await expect(repository.listProjects()).resolves.toEqual([second])
  })

  it("存在しない案件を削除すると GanttNotFoundError", async () => {
    await expect(repository.deleteProject("missing")).rejects.toThrow(
      GanttNotFoundError,
    )
  })
})

describe("案件の完了", () => {
  it("isCompleted: true で完了日時が付き、ほかのフィールドと一緒に保存できる", async () => {
    const tanaka = await repository.createMember({ name: "田中" })
    const project = await repository.createProject(buildProjectInput(tanaka.id))
    vi.setSystemTime(UPDATED_AT)

    const completed = await repository.updateProject(project.id, {
      name: "案件A（完了）",
      isCompleted: true,
    })

    expect(completed).toEqual({
      ...project,
      name: "案件A（完了）",
      completedAt: UPDATED_AT.toISOString(),
      updatedAt: UPDATED_AT.toISOString(),
    })
    await expect(repository.listProjects()).resolves.toEqual([completed])
  })

  it("完了済みの案件にもう一度 isCompleted: true を渡しても、完了日時は最初のまま", async () => {
    const tanaka = await repository.createMember({ name: "田中" })
    const project = await repository.createProject(buildProjectInput(tanaka.id))
    const completed = await repository.updateProject(project.id, {
      isCompleted: true,
    })
    vi.setSystemTime(UPDATED_AT)

    const again = await repository.updateProject(project.id, {
      isCompleted: true,
    })

    expect(again.completedAt).toBe(completed.completedAt)
    expect(again.completedAt).toBe(CREATED_AT.toISOString())
    expect(again.updatedAt).toBe(UPDATED_AT.toISOString())
  })

  it("isCompleted: false で未完了（null）に戻る", async () => {
    const tanaka = await repository.createMember({ name: "田中" })
    const project = await repository.createProject(buildProjectInput(tanaka.id))
    await repository.updateProject(project.id, { isCompleted: true })

    const reopened = await repository.updateProject(project.id, {
      isCompleted: false,
    })

    expect(reopened.completedAt).toBeNull()
    await expect(repository.listProjects()).resolves.toEqual([reopened])
  })

  it("isCompleted を省略した更新では、完了の状態を変えない（completedAt が入力に混ざっていても無視する）", async () => {
    const tanaka = await repository.createMember({ name: "田中" })
    const project = await repository.createProject(buildProjectInput(tanaka.id))
    const completed = await repository.updateProject(project.id, {
      isCompleted: true,
    })

    // 変数に入れてから渡し、型にないキー（completedAt）が混ざった入力を再現する
    const input = { name: "改名", completedAt: null }
    const renamed = await repository.updateProject(project.id, input)

    expect(renamed.completedAt).toBe(completed.completedAt)
  })
})

describe("案件の並び替え", () => {
  it("渡した順に sortOrder を振り直し、順番が変わった案件だけ updatedAt を進める", async () => {
    const tanaka = await repository.createMember({ name: "田中" })
    const a = await repository.createProject(buildProjectInput(tanaka.id))
    const b = await repository.createProject(buildProjectInput(tanaka.id))
    const c = await repository.createProject(buildProjectInput(tanaka.id))
    vi.setSystemTime(UPDATED_AT)

    const reordered = await repository.reorderProjects(tanaka.id, [
      a.id,
      c.id,
      b.id,
    ])

    expect(reordered).toEqual([
      a,
      { ...c, sortOrder: 1, updatedAt: UPDATED_AT.toISOString() },
      { ...b, sortOrder: 2, updatedAt: UPDATED_AT.toISOString() },
    ])
  })

  it("保存順と、ほかの担当者の案件は変えない", async () => {
    const tanaka = await repository.createMember({ name: "田中" })
    const sato = await repository.createMember({ name: "佐藤" })
    const a = await repository.createProject(buildProjectInput(tanaka.id))
    const other = await repository.createProject(buildProjectInput(sato.id))
    const b = await repository.createProject(buildProjectInput(tanaka.id))

    await repository.reorderProjects(tanaka.id, [b.id, a.id])

    const projects = await repository.listProjects()
    expect(projects.map((project) => project.id)).toEqual([
      a.id,
      other.id,
      b.id,
    ])
    expect(projects.map((project) => project.sortOrder)).toEqual([1, 0, 0])
    // 別のインスタンスから読んでも残っている（再読み込み後も残る）
    await expect(
      new LocalStorageRepository(storage).listProjects(),
    ).resolves.toEqual(projects)
  })

  it("案件のない担当者は空配列で並び替えられる", async () => {
    const tanaka = await repository.createMember({ name: "田中" })

    await expect(repository.reorderProjects(tanaka.id, [])).resolves.toEqual([])
  })

  it("id が重複していると GanttValidationError で、保存内容は変わらない", async () => {
    const tanaka = await repository.createMember({ name: "田中" })
    const a = await repository.createProject(buildProjectInput(tanaka.id))
    const b = await repository.createProject(buildProjectInput(tanaka.id))

    await expect(
      repository.reorderProjects(tanaka.id, [a.id, a.id, b.id]),
    ).rejects.toThrow(GanttValidationError)
    await expect(repository.listProjects()).resolves.toEqual([a, b])
  })

  it("足りない id があると GanttValidationError", async () => {
    const tanaka = await repository.createMember({ name: "田中" })
    const a = await repository.createProject(buildProjectInput(tanaka.id))
    await repository.createProject(buildProjectInput(tanaka.id))

    await expect(repository.reorderProjects(tanaka.id, [a.id])).rejects.toThrow(
      GanttValidationError,
    )
  })

  it("ほかの担当者の案件・存在しない id があると GanttValidationError", async () => {
    const tanaka = await repository.createMember({ name: "田中" })
    const sato = await repository.createMember({ name: "佐藤" })
    const a = await repository.createProject(buildProjectInput(tanaka.id))
    const other = await repository.createProject(buildProjectInput(sato.id))

    await expect(
      repository.reorderProjects(tanaka.id, [a.id, other.id]),
    ).rejects.toThrow(GanttValidationError)
    await expect(
      repository.reorderProjects(tanaka.id, [a.id, "missing"]),
    ).rejects.toThrow(GanttValidationError)
  })

  it("存在しない担当者を指定すると GanttNotFoundError", async () => {
    await expect(repository.reorderProjects("missing", [])).rejects.toThrow(
      GanttNotFoundError,
    )
  })
})

describe("保存と読み込み", () => {
  it("同じ Storage を使えば、別のインスタンスからも読める（再読み込み後も残る）", async () => {
    const tanaka = await repository.createMember({ name: "田中" })
    const project = await repository.createProject(buildProjectInput(tanaka.id))

    const reloaded = new LocalStorageRepository(storage)

    await expect(reloaded.listMembers()).resolves.toEqual([tanaka])
    await expect(reloaded.listProjects()).resolves.toEqual([project])
  })

  it("JSON として読めないデータは捨てて空配列から始め、警告を出す", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    storage.setItem(STORAGE_KEYS.members, "{壊れた JSON")

    await expect(repository.listMembers()).resolves.toEqual([])
    expect(warn).toHaveBeenCalledOnce()
  })

  it("形が違うデータは捨てて空配列から始め、警告を出す", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    storage.setItem(STORAGE_KEYS.projects, JSON.stringify({ not: "array" }))

    await expect(repository.listProjects()).resolves.toEqual([])
    expect(warn).toHaveBeenCalledOnce()
  })

  it("不正な要素が 1 つでも混ざっていれば、その配列ごと捨てる", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {})
    const tanaka = await repository.createMember({ name: "田中" })
    storage.setItem(
      STORAGE_KEYS.members,
      JSON.stringify([tanaka, { id: "broken" }]),
    )

    await expect(repository.listMembers()).resolves.toEqual([])
  })

  it("壊れたデータがあっても、その後の追加はできる", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {})
    storage.setItem(STORAGE_KEYS.members, "null")

    const tanaka = await repository.createMember({ name: "田中" })

    await expect(repository.listMembers()).resolves.toEqual([tanaka])
  })
})

describe("スキーマのバージョン", () => {
  it("初回の読み書きで現在のバージョンを保存する", async () => {
    await repository.listMembers()

    expect(storage.getItem(STORAGE_KEYS.schemaVersion)).toBe(
      String(CURRENT_SCHEMA_VERSION),
    )
  })

  it("読めないバージョンは現在のバージョンで上書きする", async () => {
    storage.setItem(STORAGE_KEYS.schemaVersion, "abc")

    await repository.listMembers()

    expect(storage.getItem(STORAGE_KEYS.schemaVersion)).toBe(
      String(CURRENT_SCHEMA_VERSION),
    )
  })

  it("アプリより新しいバージョンなら読み書きを拒否し、保存データをそのまま残す", async () => {
    // 新しいアプリで保存された、今の型ガードに合わない構造のデータ
    const newerMembers = JSON.stringify({ items: [{ id: "m1" }] })
    storage.setItem(STORAGE_KEYS.schemaVersion, "99")
    storage.setItem(STORAGE_KEYS.members, newerMembers)

    await expect(repository.listMembers()).rejects.toThrow(
      GanttUnsupportedSchemaError,
    )
    await expect(repository.listProjects()).rejects.toThrow(
      GanttUnsupportedSchemaError,
    )
    await expect(repository.createMember({ name: "田中" })).rejects.toThrow(
      GanttUnsupportedSchemaError,
    )

    expect(storage.getItem(STORAGE_KEYS.schemaVersion)).toBe("99")
    expect(storage.getItem(STORAGE_KEYS.members)).toBe(newerMembers)
    expect(storage.getItem(STORAGE_KEYS.projects)).toBeNull()
  })

  it("拒否したエラーに保存データと対応のバージョンが入っている", async () => {
    const newerVersion = CURRENT_SCHEMA_VERSION + 1
    storage.setItem(STORAGE_KEYS.schemaVersion, String(newerVersion))

    await expect(repository.listMembers()).rejects.toMatchObject({
      storedVersion: newerVersion,
      supportedVersion: CURRENT_SCHEMA_VERSION,
    })
  })

  it("一度読み込んだ後に別のタブがスキーマを更新したら、以降の読み書きを拒否してデータを残す", async () => {
    // 古いアプリのタブで一度読み込み、バージョン確認を済ませた状態にする
    const tanaka = await repository.createMember({ name: "田中" })
    await repository.listMembers()

    // 新しいアプリの別タブが、同じ Storage のデータを新しい構造に移行した
    const migratedMembers = JSON.stringify({ items: [{ id: tanaka.id }] })
    const newerVersion = String(CURRENT_SCHEMA_VERSION + 1)
    storage.setItem(STORAGE_KEYS.schemaVersion, newerVersion)
    storage.setItem(STORAGE_KEYS.members, migratedMembers)

    await expect(repository.listMembers()).rejects.toThrow(
      GanttUnsupportedSchemaError,
    )
    await expect(repository.createMember({ name: "佐藤" })).rejects.toThrow(
      GanttUnsupportedSchemaError,
    )
    expect(storage.getItem(STORAGE_KEYS.schemaVersion)).toBe(newerVersion)
    expect(storage.getItem(STORAGE_KEYS.members)).toBe(migratedMembers)
  })
})

describe("スキーマの移行（バージョン 1 → 2）", () => {
  /** バージョン 1 の形の担当者（構造はバージョン 2 と同じ） */
  const buildMemberV1 = (id: string) => ({
    id,
    name: id,
    sortOrder: 0,
    createdAt: CREATED_AT.toISOString(),
    updatedAt: CREATED_AT.toISOString(),
  })
  /** バージョン 1 の形の案件（sortOrder がない） */
  const buildProjectV1 = (
    id: string,
    memberId: string,
    startDate: string,
    endDate: string,
  ) => ({
    id,
    memberId,
    name: id,
    startDate,
    endDate,
    color: "blue",
    note: "",
    createdAt: CREATED_AT.toISOString(),
    updatedAt: CREATED_AT.toISOString(),
  })

  /** バージョン 1 のデータを保存した状態にする */
  const storeV1Data = (projects: unknown) => {
    storage.setItem(STORAGE_KEYS.schemaVersion, "1")
    storage.setItem(
      STORAGE_KEYS.members,
      JSON.stringify([buildMemberV1("a"), buildMemberV1("b")]),
    )
    storage.setItem(STORAGE_KEYS.projects, JSON.stringify(projects))
  }

  it("案件が 1 件も消えず、担当者ごとに開始日順（同じなら終了日順・保存順）で 0 から sortOrder が付く", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const v1Projects = [
      buildProjectV1("a-late", "a", "2026-10-20", "2026-10-25"),
      buildProjectV1("b-only", "b", "2026-10-01", "2026-10-02"),
      buildProjectV1("a-early-long", "a", "2026-10-05", "2026-10-30"),
      buildProjectV1("a-early-short", "a", "2026-10-05", "2026-10-06"),
      buildProjectV1("a-early-short-2", "a", "2026-10-05", "2026-10-06"),
      // 担当者が見つからない案件も残し、memberId ごとに番号を振る
      buildProjectV1("ghost-2", "ghost", "2026-11-01", "2026-11-02"),
      buildProjectV1("ghost-1", "ghost", "2026-10-01", "2026-10-02"),
    ]
    storeV1Data(v1Projects)

    const projects = await repository.listProjects()

    expect(warn).not.toHaveBeenCalled()
    // 保存順はそのままで、各案件に sortOrder が足されている。
    // 続けて 2 → 3 の移行も走るので、completedAt（未完了）も足されている
    expect(projects).toEqual([
      { ...v1Projects[0], sortOrder: 3, completedAt: null },
      { ...v1Projects[1], sortOrder: 0, completedAt: null },
      { ...v1Projects[2], sortOrder: 2, completedAt: null },
      { ...v1Projects[3], sortOrder: 0, completedAt: null },
      { ...v1Projects[4], sortOrder: 1, completedAt: null },
      { ...v1Projects[5], sortOrder: 1, completedAt: null },
      { ...v1Projects[6], sortOrder: 0, completedAt: null },
    ])
    await expect(repository.listMembers()).resolves.toEqual([
      buildMemberV1("a"),
      buildMemberV1("b"),
    ])
  })

  it("1 → 2 → 3 と続けて移行して最新のバージョンとして保存され、再読み込みしても移行し直さない", async () => {
    storeV1Data([buildProjectV1("p1", "a", "2026-10-01", "2026-10-02")])

    await repository.listProjects()

    expect(storage.getItem(STORAGE_KEYS.schemaVersion)).toBe(
      String(CURRENT_SCHEMA_VERSION),
    )
    const migrated = storage.getItem(STORAGE_KEYS.projects)
    await new LocalStorageRepository(storage).listProjects()
    expect(storage.getItem(STORAGE_KEYS.projects)).toBe(migrated)
  })

  it("案件が未保存なら何もせず、バージョンだけを上げる", async () => {
    storage.setItem(STORAGE_KEYS.schemaVersion, "1")

    await expect(repository.listProjects()).resolves.toEqual([])
    expect(storage.getItem(STORAGE_KEYS.projects)).toBeNull()
    expect(storage.getItem(STORAGE_KEYS.schemaVersion)).toBe(
      String(CURRENT_SCHEMA_VERSION),
    )
  })

  it.each([
    ["JSON として読めない", "{壊れた JSON"],
    ["配列でない", JSON.stringify({ not: "array" })],
    ["日付のない要素がある", JSON.stringify([{ id: "p1", memberId: "a" }])],
  ])(
    "壊れたデータ（%s）でも例外にならず、データは書き換えない",
    async (_, raw) => {
      vi.spyOn(console, "warn").mockImplementation(() => {})
      storage.setItem(STORAGE_KEYS.schemaVersion, "1")
      storage.setItem(STORAGE_KEYS.projects, raw)

      await expect(repository.listProjects()).resolves.toEqual([])
      expect(storage.getItem(STORAGE_KEYS.projects)).toBe(raw)
    },
  )
})

describe("スキーマの移行（バージョン 2 → 3）", () => {
  /** バージョン 2 の形の担当者（構造はバージョン 3 と同じ） */
  const MEMBER_V2 = {
    id: "a",
    name: "a",
    sortOrder: 0,
    createdAt: CREATED_AT.toISOString(),
    updatedAt: CREATED_AT.toISOString(),
  }
  /** バージョン 2 の形の案件（completedAt がない） */
  const buildProjectV2 = (id: string, sortOrder: number) => ({
    id,
    memberId: "a",
    name: id,
    startDate: "2026-10-01",
    endDate: "2026-10-02",
    color: "blue",
    note: "",
    sortOrder,
    createdAt: CREATED_AT.toISOString(),
    updatedAt: CREATED_AT.toISOString(),
  })

  /** バージョン 2 のデータを保存した状態にする */
  const storeV2Data = (projects: unknown) => {
    storage.setItem(STORAGE_KEYS.schemaVersion, "2")
    storage.setItem(STORAGE_KEYS.members, JSON.stringify([MEMBER_V2]))
    storage.setItem(STORAGE_KEYS.projects, JSON.stringify(projects))
  }

  it("正しいデータを読むと、案件が 1 件も消えずに未完了として読める（保存順・sortOrder も変えない）", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const v2Projects = [
      buildProjectV2("p2", 1),
      buildProjectV2("p1", 0),
      buildProjectV2("p3", 2),
    ]
    storeV2Data(v2Projects)

    const projects = await repository.listProjects()

    expect(warn).not.toHaveBeenCalled()
    expect(projects).toEqual(
      v2Projects.map((project) => ({ ...project, completedAt: null })),
    )
    await expect(repository.listMembers()).resolves.toEqual([MEMBER_V2])
    expect(storage.getItem(STORAGE_KEYS.schemaVersion)).toBe("3")
  })

  it("移行後は完了にでき、再読み込みしても移行し直さない", async () => {
    storeV2Data([buildProjectV2("p1", 0)])
    await repository.updateProject("p1", { isCompleted: true })

    const reloaded = await new LocalStorageRepository(storage).listProjects()

    expect(reloaded[0]?.completedAt).toBe(CREATED_AT.toISOString())
  })

  it.each([
    ["JSON として読めない", "{壊れた JSON"],
    ["配列でない", JSON.stringify({ not: "array" })],
    ["sortOrder のない要素がある", JSON.stringify([{ id: "p1" }])],
  ])(
    "壊れたデータ（%s）でも例外にならず、データは書き換えない",
    async (_, raw) => {
      vi.spyOn(console, "warn").mockImplementation(() => {})
      storage.setItem(STORAGE_KEYS.schemaVersion, "2")
      storage.setItem(STORAGE_KEYS.projects, raw)

      await expect(repository.listProjects()).resolves.toEqual([])
      expect(storage.getItem(STORAGE_KEYS.projects)).toBe(raw)
    },
  )
})

describe("実行環境", () => {
  it("Storage を渡さず window もない環境（サーバー側）で呼ぶとエラーになる", async () => {
    // テストは node 環境で動くため window がない
    const serverSideRepository = new LocalStorageRepository()

    await expect(serverSideRepository.listMembers()).rejects.toThrow(
      /ブラウザでのみ/,
    )
  })
})
