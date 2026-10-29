import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { STORAGE_KEYS } from "../gantt.constants"
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
      createdAt: CREATED_AT.toISOString(),
      updatedAt: CREATED_AT.toISOString(),
    })
    await expect(repository.listProjects()).resolves.toEqual([project])
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

    expect(storage.getItem(STORAGE_KEYS.schemaVersion)).toBe("1")
  })

  it("読めないバージョンは現在のバージョンで上書きする", async () => {
    storage.setItem(STORAGE_KEYS.schemaVersion, "abc")

    await repository.listMembers()

    expect(storage.getItem(STORAGE_KEYS.schemaVersion)).toBe("1")
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
    storage.setItem(STORAGE_KEYS.schemaVersion, "2")

    await expect(repository.listMembers()).rejects.toMatchObject({
      storedVersion: 2,
      supportedVersion: 1,
    })
  })
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
