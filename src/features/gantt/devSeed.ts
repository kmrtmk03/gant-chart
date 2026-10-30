import { endOfMonth } from "date-fns"

import {
  DEFAULT_RANGE_DAYS,
  DEFAULT_RANGE_DAYS_BEFORE,
} from "./gantt.constants"
import type { TProjectInput } from "./gantt.type"
import { addDays, getToday, toDateString } from "./gantt.utils"
import type { IGanttRepository } from "./repositories/ganttRepository.type"

/**
 * 開発中の動作確認用に、サンプルの担当者と案件を保存する。画面から呼ぶのは開発ビルドのときだけにすること。
 * 日付は今日からの相対で決めるので、いつ実行しても同じ並びになる。
 * 月またぎ・初期の表示期間の前後にはみ出す案件・表示期間外（左へスクロールして範囲が広がると現れる）・
 * 1 日だけの案件・案件のない担当者を含む。はみ出す・期間外の判定は初期の表示期間（gantt.constants.ts）を基準にする。
 * 既存のデータは消さず、追加するだけ。
 */
export async function seedSampleData(
  repository: IGanttRepository,
): Promise<void> {
  const today = getToday()
  const monthEnd = toDateString(endOfMonth(new Date()))
  // 初期の表示期間は「今日の DEFAULT_RANGE_DAYS_BEFORE 日前」から DEFAULT_RANGE_DAYS 日間（最終日は rangeEndOffset 日後）
  const rangeStartOffset = -DEFAULT_RANGE_DAYS_BEFORE
  const rangeEndOffset = DEFAULT_RANGE_DAYS - DEFAULT_RANGE_DAYS_BEFORE - 1

  const tanaka = await repository.createMember({ name: "田中" })
  const sato = await repository.createMember({ name: "佐藤" })
  await repository.createMember({ name: "鈴木" })

  const projects: TProjectInput[] = [
    {
      memberId: tanaka.id,
      name: "Web サイト改修",
      startDate: addDays(today, -3),
      endDate: addDays(today, 10),
      color: "blue",
      note: "",
    },
    {
      memberId: tanaka.id,
      name: "バナー制作（1 日だけ）",
      startDate: addDays(today, 12),
      endDate: addDays(today, 12),
      color: "orange",
      note: "",
    },
    {
      memberId: tanaka.id,
      name: "過去の案件（表示期間外）",
      // 期間の開始より前に終わる（初期の表示期間の外）
      startDate: addDays(today, rangeStartOffset - 30),
      endDate: addDays(today, rangeStartOffset - 10),
      color: "gray",
      note: "",
    },
    {
      memberId: sato.id,
      name: "アプリ開発（開始が期間より前）",
      startDate: addDays(today, rangeStartOffset - 20),
      endDate: addDays(today, 20),
      color: "green",
      note: "",
    },
    {
      memberId: sato.id,
      name: "月またぎの作業",
      startDate: addDays(monthEnd, -3),
      endDate: addDays(monthEnd, 5),
      color: "purple",
      note: "",
    },
    {
      memberId: sato.id,
      name: "長期保守（終了が期間より後）",
      startDate: addDays(today, 30),
      endDate: addDays(today, rangeEndOffset + 30),
      color: "red",
      note: "",
    },
  ]
  for (const project of projects) {
    await repository.createProject(project)
  }
}
