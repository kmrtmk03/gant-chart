import { STORAGE_KEYS } from "../gantt.constants"
import { isDateString } from "../gantt.guards"
import { GanttCorruptedDataError } from "./ganttRepository.errors"

// MEMO: このファイルの移行処理は、移行元のバージョンの構造を前提に書く。
// 今の型（IProject）や型ガード（isProject）は、後のバージョンで構造が変わるたびに書き換わるので使わない
// （例: sortOrder を足した後の isProject でバージョン 1 のデータを確かめると、すべて「形が違う」になる）。
// また、移行処理は repository のメソッドを呼ばず、渡された Storage を直接読み書きすること
// （repository のメソッドは読み書きの前に移行を確かめるので、移行の中から呼ぶと無限に再帰する）。
//
// 移行の前に、案件の全件を「移行元のバージョンの形」として検証する。1 件でも外れていれば、案件もバージョンも
// 変えずに GanttCorruptedDataError を投げる。次の 2 つを防ぐため:
// - 不正なデータにも移行の結果（sortOrder・completedAt）を書き足してバージョンを進め、後の読み込みで初めて不正と分かる
// - バージョンの値だけが古く壊れていて、案件はすでに新しい形のとき、足すフィールド（completedAt など）を既存の値の上から null で上書きする
// そのため、移行で足すフィールドを持つ案件も「移行元の形ではない」として止める。
// 検証に使う日付の判定（isDateString。実在する "YYYY-MM-DD" か）は、今後も変わらない概念なので共通のものを使う。
// 色や並び順の値の範囲は、バージョンごとに変わりうるので、ここでは型だけを確かめる。

/** プロパティを読める「null でないオブジェクト」かを確かめる（配列も除く） */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * バージョン 1・2 の案件に共通のフィールドが、正しい型で揃っているか。
 * バージョン 1 では表示順を決める memberId / startDate / endDate も使うので、型を絞って返す。
 */
function hasProjectBaseFields(
  value: unknown,
): value is Record<string, unknown> & IProjectV1SortKeys {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.id !== "" &&
    typeof value.memberId === "string" &&
    value.memberId !== "" &&
    typeof value.name === "string" &&
    isDateString(value.startDate) &&
    isDateString(value.endDate) &&
    // "YYYY-MM-DD" は桁数が揃っているので、文字列の比較で日付の前後を判定できる
    value.startDate <= value.endDate &&
    typeof value.color === "string" &&
    typeof value.note === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  )
}

/** バージョン 1 の案件のうち、表示順を決めるのに使うフィールド */
interface IProjectV1SortKeys {
  memberId: string
  startDate: string
  endDate: string
}

/**
 * バージョン 1 の案件か。共通のフィールドが揃っていて、後のバージョンで足す sortOrder・completedAt を持たないこと
 * （持っていれば、バージョンの値だけが古く壊れていて、すでに新しい形のデータとみなす）
 */
function isProjectV1(
  value: unknown,
): value is Record<string, unknown> & IProjectV1SortKeys {
  return (
    hasProjectBaseFields(value) &&
    !("sortOrder" in value) &&
    !("completedAt" in value)
  )
}

/**
 * バージョン 1 → 2: 案件に、担当者の中での表示順（sortOrder）を振る。
 *
 * - 並びはバージョン 1 の画面と同じ（担当者ごとに開始日順 → 終了日順。同じなら保存順）にし、
 *   移行の直後に見た目の並びが変わらないようにする
 * - 番号は memberId ごとに 0 から振る。担当者が見つからない案件（memberId が不正）も、
 *   画面には出ないがデータとしては残っているので、同じように番号を振る
 * - 保存データが壊れている（JSON として読めない・配列でない・バージョン 1 の形でない案件がある）ときは、
 *   書き換えずに GanttCorruptedDataError を投げる（バージョンも進まない。空として扱うと次の書き込みで上書きするため）
 */
export function migrateSchemaV1ToV2(storage: Storage): void {
  const raw = storage.getItem(STORAGE_KEYS.projects)
  if (raw === null) return

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new GanttCorruptedDataError(
      STORAGE_KEYS.projects,
      "JSON として読めない",
    )
  }
  if (!Array.isArray(parsed) || !parsed.every(isProjectV1)) {
    throw new GanttCorruptedDataError(
      STORAGE_KEYS.projects,
      "移行できない形のデータを含んでいる",
    )
  }
  const projects = parsed

  // 表示順に並べる。Array.prototype.sort は安定ソートなので、日付が同じなら保存順のまま
  const sortedEntries = projects
    .map((project, index) => ({ project, index }))
    .sort(
      (a, b) =>
        a.project.startDate.localeCompare(b.project.startDate) ||
        a.project.endDate.localeCompare(b.project.endDate),
    )

  // 担当者ごとに、表示順に 0 から番号を振る（キーは保存順の添字）
  const sortOrderByIndex = new Map<number, number>()
  const nextSortOrderByMemberId = new Map<string, number>()
  for (const { project, index } of sortedEntries) {
    const sortOrder = nextSortOrderByMemberId.get(project.memberId) ?? 0
    sortOrderByIndex.set(index, sortOrder)
    nextSortOrderByMemberId.set(project.memberId, sortOrder + 1)
  }

  // 保存順（配列の並び）は変えず、各案件に sortOrder を足すだけにする
  const migrated = projects.map((project, index) => ({
    ...project,
    sortOrder: sortOrderByIndex.get(index) ?? 0,
  }))
  storage.setItem(STORAGE_KEYS.projects, JSON.stringify(migrated))
}

/**
 * バージョン 2 の案件か。共通のフィールドに加えて、バージョン 2 で足した sortOrder（0 以上の整数）を持ち、
 * バージョン 3 で足す completedAt を持たないこと（持っていれば、すでに新しい形のデータなので上書きしない）
 */
function isProjectV2(value: unknown): value is Record<string, unknown> {
  return (
    hasProjectBaseFields(value) &&
    typeof value.sortOrder === "number" &&
    Number.isInteger(value.sortOrder) &&
    value.sortOrder >= 0 &&
    !("completedAt" in value)
  )
}

/**
 * バージョン 2 → 3: 案件に完了日時（completedAt）を足す。既存の案件はすべて未完了（null）にする。
 *
 * - 保存データが壊れている（JSON として読めない・配列でない・バージョン 2 の形でない案件がある）ときは、
 *   書き換えずに GanttCorruptedDataError を投げる（バージョンも進まない）
 */
export function migrateSchemaV2ToV3(storage: Storage): void {
  const raw = storage.getItem(STORAGE_KEYS.projects)
  if (raw === null) return

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new GanttCorruptedDataError(
      STORAGE_KEYS.projects,
      "JSON として読めない",
    )
  }
  if (!Array.isArray(parsed) || !parsed.every(isProjectV2)) {
    throw new GanttCorruptedDataError(
      STORAGE_KEYS.projects,
      "移行できない形のデータを含んでいる",
    )
  }

  // 保存順（配列の並び）は変えず、各案件に completedAt を足すだけにする
  const migrated = parsed.map((project) => ({ ...project, completedAt: null }))
  storage.setItem(STORAGE_KEYS.projects, JSON.stringify(migrated))
}
