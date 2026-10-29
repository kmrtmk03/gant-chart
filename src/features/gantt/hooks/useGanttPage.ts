import { useCallback, useMemo, useState } from "react"

import { seedSampleData } from "../devSeed"
import { getDayColumns, groupProjectsByMember, toError } from "../gantt.utils"
import { createGanttRepository } from "../repositories/createGanttRepository"
import { useCollapsedMembers } from "./useCollapsedMembers"
import { useMembers } from "./useMembers"
import { useProjects } from "./useProjects"
import { useTimelineRange } from "./useTimelineRange"
import { useTimelineScroll } from "./useTimelineScroll"

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
  const timelineScroll = useTimelineScroll({
    rangeStart: timelineRange.rangeStart,
    today: timelineRange.today,
    onExtendBackward: timelineRange.extendBackward,
    onExtendForward: timelineRange.extendForward,
  })
  const { collapsedMemberIds, toggleMember } = useCollapsedMembers()

  // 担当者ごとの案件のまとまりと日の列は state にせず、members / projects / 表示期間から計算する。
  // useMemo で包むのは、画面の左端の日付（visibleDate）が変わるたびにこのフックが走り直しても、
  // 参照を保って重いコンポーネント（React.memo 済み）の再描画を避けるため。
  const memberGroups = useMemo(
    () =>
      members === null || projects === null
        ? null
        : groupProjectsByMember(members, projects),
    [members, projects],
  )
  const { rangeStart, rangeDays } = timelineRange
  const columns = useMemo(
    () => (rangeStart === null ? null : getDayColumns(rangeStart, rangeDays)),
    [rangeStart, rangeDays],
  )

  const [isSeeding, setIsSeeding] = useState(false)
  const [seedError, setSeedError] = useState<Error | null>(null)

  /**
   * サンプルデータを保存して読み込み直す。開発ビルドでしか動かない。
   * 既存のデータは消さず追加するだけなので、実行中は二重に走らせない
   * （成功すると空の画面でなくなり、ボタン自体が消える）。失敗は握りつぶさず `seedError` に載せる。
   */
  const handleSeedSampleData = useCallback(async () => {
    if (!CAN_SEED_SAMPLE_DATA || isSeeding) return
    setIsSeeding(true)
    setSeedError(null)
    try {
      await seedSampleData(repository)
      await Promise.all([reloadMembers(), reloadProjects()])
    } catch (caught) {
      setSeedError(toError(caught))
    } finally {
      setIsSeeding(false)
    }
  }, [isSeeding, reloadMembers, reloadProjects])

  // TODO: フェーズ 6 で案件の追加（サイドパネルを開き、memberId の担当者を初期値にする）に置き換える
  const handleAddProject = useCallback((memberId: string) => {
    void memberId
  }, [])
  // TODO: フェーズ 7 で担当者の管理画面を開く処理に置き換える
  const handleManageMembers = useCallback(() => {}, [])

  return {
    // 読み込みの状態
    isLoading:
      memberGroups === null ||
      timelineRange.today === null ||
      rangeStart === null,
    loadError: membersError ?? projectsError,
    // データ
    memberGroups,
    // 表示期間（rangeStart / today / columns は未確定の間 null）
    range: {
      today: timelineRange.today,
      rangeStart,
      rangeDays,
      columns,
    },
    // スクロール（attachScroller / handleScroll はスクロール領域に渡す。visibleDate は画面の左端の日付）
    scroll: timelineScroll,
    // 折りたたみ
    collapsedMemberIds,
    toggleMember,
    // ボタンの操作
    canSeedSampleData: CAN_SEED_SAMPLE_DATA,
    isSeeding,
    seedError,
    seedSampleData: handleSeedSampleData,
    addProject: handleAddProject,
    manageMembers: handleManageMembers,
  }
}
