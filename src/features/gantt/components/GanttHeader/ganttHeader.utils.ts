/**
 * 「完了済みを表示」の切り替えボタンの文言を作る。完了済みの件数を添える（0 件でも出す）。
 * 例: "完了済みを表示（3）"
 */
export function formatCompletedToggleLabel(completedCount: number): string {
  return `完了済みを表示（${completedCount}）`
}

/**
 * 狭い画面で使う、切り替えボタンの短い文言を作る（ヘッダーが横にはみ出さないようにするため）。
 * 例: "完了済み（3）"
 */
export function formatCompletedToggleShortLabel(
  completedCount: number,
): string {
  return `完了済み（${completedCount}）`
}
