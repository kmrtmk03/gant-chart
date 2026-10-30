import { useCallback, useMemo, useState } from "react"

import { seedSampleData } from "../devSeed"
import type { TProjectInput } from "../gantt.type"
import {
  getDayColumns,
  groupProjectsByMember,
  toError,
  type TProjectPeriod,
} from "../gantt.utils"
import { createGanttRepository } from "../repositories/createGanttRepository"
import { useCollapsedMembers } from "./useCollapsedMembers"
import { useMemberManagement } from "./useMemberManagement"
import { useMembers } from "./useMembers"
import { useProjects } from "./useProjects"
import { useSidePanel } from "./useSidePanel"
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
  const {
    members,
    membersError,
    reloadMembers,
    createMember,
    renameMember,
    reorderMembers,
    deleteMember,
  } = useMembers(repository)
  const {
    projects,
    projectsError,
    reloadProjects,
    createProject,
    updateProject,
    deleteProject,
    reorderProjects,
    removeProjectsOfMember,
  } = useProjects(repository)
  const { sidePanelState, openCreatePanel, openEditPanel, closePanel } =
    useSidePanel()
  const memberManagement = useMemberManagement({
    members,
    createMember,
    renameMember,
    reorderMembers,
    deleteMember,
    removeProjectsOfMember,
    closeSidePanel: closePanel,
  })
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

  /**
   * 読み込みに失敗した画面から、担当者と案件を読み込み直す。成功すると両方のエラーが消えて画面に戻る。
   * 失敗したときはエラーが残るので、もう一度押せる（再読み込みの失敗は各フックが state に載せる）
   */
  const handleRetryLoad = useCallback(async () => {
    await Promise.all([reloadMembers(), reloadProjects()])
  }, [reloadMembers, reloadProjects])

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

  // 帯のドラッグによる期間の保存に失敗したときのエラー。画面の下に出し、閉じるか次の保存で消す
  const [periodChangeError, setPeriodChangeError] = useState<Error | null>(null)

  /**
   * 帯のドラッグで変えた期間を保存する。失敗は例外にせず `periodChangeError` に載せる
   * （帯は保存が終わると元の位置に戻るので、失敗したことを画面で知らせる）。
   * `Timeline` の React.memo を保つため、参照は `updateProject` が変わらない限り同じ。
   */
  const handleChangeProjectPeriod = useCallback(
    async (projectId: string, period: TProjectPeriod) => {
      setPeriodChangeError(null)
      try {
        await updateProject(projectId, period)
      } catch (caught) {
        setPeriodChangeError(toError(caught))
      }
    },
    [updateProject],
  )

  const handleDismissPeriodChangeError = useCallback(() => {
    setPeriodChangeError(null)
  }, [])

  // 左のリストで案件を並べ替えたときの保存に失敗したときのエラー。画面の下に出し、閉じるか次の保存で消す
  const [projectReorderError, setProjectReorderError] = useState<Error | null>(
    null,
  )

  /**
   * 左のリストのドラッグで並べ替えた案件の並びを保存する。失敗は例外にせず `projectReorderError` に載せる
   * （リストは保存が終わると元の並びに戻るので、失敗したことを画面で知らせる）。
   * `MemberList` の React.memo を保つため、参照は `reorderProjects` が変わらない限り同じ。
   */
  const handleReorderProjects = useCallback(
    async (memberId: string, orderedIds: string[]) => {
      setProjectReorderError(null)
      try {
        await reorderProjects(memberId, orderedIds)
      } catch (caught) {
        setProjectReorderError(toError(caught))
      }
    },
    [reorderProjects],
  )

  const handleDismissProjectReorderError = useCallback(() => {
    setProjectReorderError(null)
  }, [])

  // 編集中の案件は state に持たず、projectId から一覧を引いて求める（データと表示をずらさない）。
  // 他のタブで削除されるなどして見つからないときは null になり、パネルは出さない
  const editingProject =
    sidePanelState.mode === "edit" && projects !== null
      ? (projects.find((project) => project.id === sidePanelState.projectId) ??
        null)
      : null

  /**
   * パネルのフォームの保存。追加か編集かはパネルの状態で決め、保存に成功してからパネルを閉じる。
   * 失敗したら例外をそのまま投げる（フォームが受け取ってパネル内に表示し、パネルは開いたままにする）。
   */
  const handleSaveProject = useCallback(
    async (input: TProjectInput) => {
      if (sidePanelState.mode === "create") {
        await createProject(input)
      } else if (sidePanelState.mode === "edit") {
        await updateProject(sidePanelState.projectId, input)
      } else {
        return
      }
      closePanel()
    },
    [sidePanelState, createProject, updateProject, closePanel],
  )

  /** 編集中の案件を削除する。削除に成功してからパネルを閉じる。失敗は例外のまま投げる */
  const handleDeleteProject = useCallback(async () => {
    if (sidePanelState.mode !== "edit") return
    await deleteProject(sidePanelState.projectId)
    closePanel()
  }, [sidePanelState, deleteProject, closePanel])

  return {
    // 読み込みの状態
    isLoading:
      memberGroups === null ||
      timelineRange.today === null ||
      rangeStart === null,
    loadError: membersError ?? projectsError,
    retryLoad: handleRetryLoad,
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
    // サイドパネル（state は追加 / 編集 / 閉じている。editingProject は編集中の案件で、見つからなければ null）
    sidePanel: {
      state: sidePanelState,
      members: members ?? [],
      editingProject,
      selectProject: openEditPanel,
      save: handleSaveProject,
      remove: handleDeleteProject,
      close: closePanel,
    },
    // 帯のドラッグ（期間の保存と、失敗したときのエラー）
    barDrag: {
      changePeriod: handleChangeProjectPeriod,
      error: periodChangeError,
      dismissError: handleDismissPeriodChangeError,
    },
    // 左のリストでの案件の並び替え（並びの保存と、失敗したときのエラー）
    projectReorder: {
      reorder: handleReorderProjects,
      error: projectReorderError,
      dismissError: handleDismissProjectReorderError,
    },
    // 担当者の管理ダイアログ（開閉と、追加・名前変更・並び替え・削除の操作）
    memberManagement,
    // 折りたたみ
    collapsedMemberIds,
    toggleMember,
    // ボタンの操作
    canSeedSampleData: CAN_SEED_SAMPLE_DATA,
    isSeeding,
    seedError,
    seedSampleData: handleSeedSampleData,
    addProject: openCreatePanel,
    manageMembers: memberManagement.openDialog,
  }
}
