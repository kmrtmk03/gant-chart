import { endOfMonth } from "date-fns"

import type { TProjectInput } from "./gantt.type"
import { addDays, getToday, toDateString } from "./gantt.utils"
import type { IGanttRepository } from "./repositories/ganttRepository.type"

/**
 * 開発中の動作確認用に、サンプルの担当者と案件を保存する。画面から呼ぶのは開発ビルドのときだけにすること。
 * 日付は今日からの相対で決めるので、いつ実行しても初期の表示期間に収まる。
 * 月またぎ・表示期間より前後に長く続く案件・表示期間外・1 日だけの案件・案件のない担当者を含む。
 * 既存のデータは消さず、追加するだけ。
 */
export async function seedSampleData(
  repository: IGanttRepository,
): Promise<void> {
  const today = getToday()
  const monthEnd = toDateString(endOfMonth(new Date()))

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
      startDate: addDays(today, -60),
      endDate: addDays(today, -30),
      color: "gray",
      note: "",
    },
    {
      memberId: sato.id,
      name: "アプリ開発（開始が期間より前）",
      startDate: addDays(today, -30),
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
      endDate: addDays(today, 120),
      color: "red",
      note: "",
    },
  ]
  for (const project of projects) {
    await repository.createProject(project)
  }
}
