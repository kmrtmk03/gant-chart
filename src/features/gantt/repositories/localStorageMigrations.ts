import { STORAGE_KEYS } from "../gantt.constants"

// MEMO: このファイルの移行処理は、移行元のバージョンの構造を前提に書く。
// 今の型（IProject）や型ガード（isProject）は、後のバージョンで構造が変わるたびに書き換わるので使わない
// （例: sortOrder を足した後の isProject でバージョン 1 のデータを確かめると、すべて「形が違う」になる）。
// また、移行処理は repository のメソッドを呼ばず、渡された Storage を直接読み書きすること
// （repository のメソッドは読み書きの前に移行を確かめるので、移行の中から呼ぶと無限に再帰する）。

/** プロパティを読める「null でないオブジェクト」かを確かめる（配列も除く） */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * バージョン 1 の案件のうち、表示順を決めるのに使うフィールド。
 * ほかのフィールドは触らずにそのまま残すので、ここでは確かめない（不正なら移行後の読み込みで既存の扱いになる）
 */
interface IProjectV1SortKeys {
  memberId: string
  startDate: string
  endDate: string
}

/** バージョン 1 の案件として、表示順を決めるのに必要なフィールドを持っているか */
function hasProjectV1SortKeys(
  value: unknown,
): value is Record<string, unknown> & IProjectV1SortKeys {
  return (
    isRecord(value) &&
    typeof value.memberId === "string" &&
    typeof value.startDate === "string" &&
    typeof value.endDate === "string"
  )
}

/**
 * バージョン 1 → 2: 案件に、担当者の中での表示順（sortOrder）を振る。
 *
 * - 並びはバージョン 1 の画面と同じ（担当者ごとに開始日順 → 終了日順。同じなら保存順）にし、
 *   移行の直後に見た目の並びが変わらないようにする
 * - 番号は memberId ごとに 0 から振る。担当者が見つからない案件（memberId が不正）も、
 *   画面には出ないがデータとしては残っているので、同じように番号を振る
 * - 保存データが壊れている（JSON として読めない・配列でない・必要なフィールドがない）ときは何もしない。
 *   その後の読み込みの既存の扱い（警告を出して空から始める）に任せる
 */
export function migrateSchemaV1ToV2(storage: Storage): void {
  const raw = storage.getItem(STORAGE_KEYS.projects)
  if (raw === null) return

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return
  }
  if (!Array.isArray(parsed) || !parsed.every(hasProjectV1SortKeys)) return
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
 * バージョン 2 の案件か（バージョン 2 で足した sortOrder を持っているか）だけを確かめる。
 * 今の isProject は completedAt を求めるので、使うと既存の案件がすべて「形が違う」になる。
 * ほかのフィールドは触らずにそのまま残すので、ここでは確かめない（不正なら移行後の読み込みで既存の扱いになる）
 */
function isProjectV2(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && typeof value.sortOrder === "number"
}

/**
 * バージョン 2 → 3: 案件に完了日時（completedAt）を足す。既存の案件はすべて未完了（null）にする。
 *
 * - 保存データが壊れている（JSON として読めない・配列でない・sortOrder のない要素がある）ときは何もしない。
 *   その後の読み込みの既存の扱い（警告を出して空から始める）に任せる
 */
export function migrateSchemaV2ToV3(storage: Storage): void {
  const raw = storage.getItem(STORAGE_KEYS.projects)
  if (raw === null) return

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return
  }
  if (!Array.isArray(parsed) || !parsed.every(isProjectV2)) return

  // 保存順（配列の並び）は変えず、各案件に completedAt を足すだけにする
  const migrated = parsed.map((project) => ({ ...project, completedAt: null }))
  storage.setItem(STORAGE_KEYS.projects, JSON.stringify(migrated))
}
