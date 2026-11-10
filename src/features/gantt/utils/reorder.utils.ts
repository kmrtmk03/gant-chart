// id の並びの入れ替え。ドラッグによる並び替え（案件・担当者）と、完了済みを隠したままの並び替えで使う。

/**
 * id の並びのうち `id` を `toIndex` 番目へ動かした新しい並びを返す（ドラッグによる並び替え用）。
 * `toIndex` は 0 〜 件数 - 1 に収める。`id` が含まれないときは null（元の配列は変更しない）。
 */
export function moveIdToIndex(
  ids: string[],
  id: string,
  toIndex: number,
): string[] | null {
  const fromIndex = ids.indexOf(id)
  if (fromIndex === -1) return null
  const clampedIndex = Math.min(Math.max(toIndex, 0), ids.length - 1)
  const moved = ids.filter((_, index) => index !== fromIndex)
  moved.splice(clampedIndex, 0, id)
  return moved
}

/**
 * 一部の id だけが見えている並び（`visibleIds`）の中で `id` を `toVisibleIndex` 番目へ動かし、
 * 見えていない id も含めた全体の並び（`allIds`）を返す（完了済みを隠したままの並び替え用）。
 *
 * 見えていない id は、見えている id との前後関係を保つ。規則は次のとおり:
 * - 動かした先の直後に見えている id があれば、その直前に入れる
 * - 見えている id の末尾へ動かしたときは、直前に見えている id の直後に入れる
 *
 * 例: 全体が `A, (B), C, D`（B は隠れている）で D を見えている並びの先頭へ → `D, A, B, C`
 *
 * `visibleIds` は `allIds` と同じ順で、その一部であること。`id` が `visibleIds` にない（または `allIds` にない）ときは null
 */
export function moveIdAmongVisible(
  allIds: string[],
  visibleIds: string[],
  id: string,
  toVisibleIndex: number,
): string[] | null {
  if (!allIds.includes(id)) return null
  const movedVisibleIds = moveIdToIndex(visibleIds, id, toVisibleIndex)
  if (movedVisibleIds === null) return null

  const movedIndex = movedVisibleIds.indexOf(id)
  const nextVisibleId = movedVisibleIds[movedIndex + 1]
  const previousVisibleId = movedVisibleIds[movedIndex - 1]
  const rest = allIds.filter((otherId) => otherId !== id)

  // 見えている id が自分だけのときは、動かす先がないので並びを変えない
  let insertIndex = allIds.indexOf(id)
  if (nextVisibleId !== undefined) {
    insertIndex = rest.indexOf(nextVisibleId)
  } else if (previousVisibleId !== undefined) {
    insertIndex = rest.indexOf(previousVisibleId) + 1
  }
  rest.splice(insertIndex, 0, id)
  return rest
}
