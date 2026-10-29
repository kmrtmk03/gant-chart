import { useCallback } from "react"

import { groupProjectsByMember } from "../gantt.utils"
import { seedSampleData } from "../devSeed"
import { createGanttRepository } from "../repositories/createGanttRepository"
import { useCollapsedMembers } from "./useCollapsedMembers"
import { useMembers } from "./useMembers"
import { useProjects } from "./useProjects"
import { useTimelineRange } from "./useTimelineRange"

/** repository はコンポーネントの外で 1 回だけ作る（生成だけならサーバー側でもエラーにならない） */
const repository = createGanttRepository()

/** サンプルデータを入れる操作を画面に出してよいか。本番ビルドでは出さない */
const CAN_SEED_SAMPLE_DATA = process.env.NODE_ENV !== "production"

/**
 * ガントチャートのページ全体のフック。責務別のフックを束ね、画面に必要な値と操作をまとめて返す。
 * データ（担当者・案件）と表示期間のどれかが未確定の間は `isLoading` が true になる。
 */
export function useGanttPage() {
  const { members, membersError, reloadMembers } = useMembers(repository)
  const { projects, projectsError, reloadProjects } = useProjects(repository)
  const timelineRange = useTimelineRange()
  const { collapsedMemberIds, toggleMember } = useCollapsedMembers()

  // 担当者ごとの案件のまとまりは state にせず、毎回 members / projects から計算する
  const memberGroups =
    members === null || projects === null
      ? null
      : groupProjectsByMember(members, projects)

  /** サンプルデータを保存して読み込み直す。開発ビルドでしか動かない */
  const handleSeedSampleData = useCallback(async () => {
    if (!CAN_SEED_SAMPLE_DATA) return
    await seedSampleData(repository)
    await Promise.all([reloadMembers(), reloadProjects()])
  }, [reloadMembers, reloadProjects])

  // TODO: フェーズ 6 で案件の追加（サイドパネルを開く）に置き換える
  const handleAddProject = useCallback(() => {}, [])
  // TODO: フェーズ 7 で担当者の管理画面を開く処理に置き換える
  const handleManageMembers = useCallback(() => {}, [])

  return {
    // 読み込みの状態
    isLoading:
      memberGroups === null ||
      timelineRange.today === null ||
      timelineRange.rangeStart === null,
    loadError: membersError ?? projectsError,
    // データ
    memberGroups,
    // 表示期間（rangeStart / today は未確定の間 null）
    range: {
      today: timelineRange.today,
      rangeStart: timelineRange.rangeStart,
      rangeDays: timelineRange.rangeDays,
      shiftBackward: timelineRange.shiftBackward,
      shiftForward: timelineRange.shiftForward,
      resetToToday: timelineRange.resetToToday,
    },
    // 折りたたみ
    collapsedMemberIds,
    toggleMember,
    // ボタンの操作
    canSeedSampleData: CAN_SEED_SAMPLE_DATA,
    seedSampleData: handleSeedSampleData,
    addProject: handleAddProject,
    manageMembers: handleManageMembers,
  }
}
