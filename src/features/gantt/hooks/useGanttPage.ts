import { useCallback, useMemo, useState } from "react"

import { seedSampleData } from "../devSeed"
import type { TProjectInput } from "../gantt.type"
import {
  countCompletedProjects,
  excludeCompletedProjects,
  getDayColumns,
  groupProjectsByMember,
  moveIdAmongVisible,
  toError,
  type TProjectPeriod,
} from "../gantt.utils"
import { createGanttRepository } from "../repositories/createGanttRepository"
import { useCollapsedMembers } from "./useCollapsedMembers"
import { useCompletedVisibility } from "./useCompletedVisibility"
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
 * 並び替えた案件を、手元の案件の一覧から見つけられなかったときの文言。
 * 別のタブで案件・担当者が削除された直後などに起きる（一覧を読み込み直せば直る）
 */
const STALE_PROJECTS_MESSAGE =
  "案件の一覧が古くなっています。ページを再読み込みしてから並べ替えてください"

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
  const { isCompletedVisible, toggleCompletedVisible } =
    useCompletedVisibility()

  // 担当者ごとの案件のまとまりと日の列は state にせず、members / projects / 表示期間から計算する。
  // useMemo で包むのは、画面の左端の日付（visibleDate）が変わるたびにこのフックが走り直しても、
  // 参照を保って重いコンポーネント（React.memo 済み）の再描画を避けるため。
  // allMemberGroups は完了済みも含めた全体（担当者の管理ダイアログ・並び替えの全体の並びに使う）、
  // memberGroups は画面に出すもの（完了済みを隠すときは、ここ 1 か所で取り除く。左右の行がずれないように）
  const allMemberGroups = useMemo(
    () =>
      members === null || projects === null
        ? null
        : groupProjectsByMember(members, projects),
    [members, projects],
  )
  const memberGroups = useMemo(
    () =>
      allMemberGroups === null || isCompletedVisible
        ? allMemberGroups
        : excludeCompletedProjects(allMemberGroups),
    [allMemberGroups, isCompletedVisible],
  )
  // 件数は画面に出しうる案件（担当者が見つかる案件）だけで数える。
  // 担当者のいない孤立した案件まで数えると、表示に切り替えても件数ぶんの案件が出てこないため
  const completedCount = useMemo(
    () =>
      allMemberGroups === null
        ? 0
        : countCompletedProjects(
            allMemberGroups.flatMap((group) => group.projects),
          ),
    [allMemberGroups],
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
   *
   * `orderedVisibleIds` は見えている案件（完了済みを隠しているときは未完了だけ）の並べ替え後の並び、
   * `movedId` は動かした案件。repository にはその担当者の全案件の id を渡す必要があるので、
   * 隠れている完了済みの案件の前後関係を保って全体の並びに戻してから保存する（`moveIdAmongVisible`）。
   * 参照は `reorderProjects` と案件の一覧が変わらない限り同じ（`MemberList` の React.memo を保つため）。
   */
  const handleReorderProjects = useCallback(
    async (memberId: string, orderedVisibleIds: string[], movedId: string) => {
      setProjectReorderError(null)
      // 全体の並び（表示順）
      const allIds = allMemberGroups
        ?.find((group) => group.member.id === memberId)
        ?.projects.map((project) => project.id)
      // 並べ替える前の見えている並び（全体の並びから、見えている id だけを同じ順で取り出す）
      const visibleIdSet = new Set(orderedVisibleIds)
      const orderedIds =
        allIds === undefined
          ? null
          : moveIdAmongVisible(
              allIds,
              allIds.filter((id) => visibleIdSet.has(id)),
              movedId,
              orderedVisibleIds.indexOf(movedId),
            )
      // 担当者・動かした案件が手元の一覧に見つからない（別のタブで削除された直後など）ときは保存しない。
      // 見えている並びのまま渡すと、完了済みを隠しているときに id が足りず、
      // repository の分かりにくい検証エラーになるため、原因の分かる文言を出す
      if (orderedIds === null) {
        setProjectReorderError(new Error(STALE_PROJECTS_MESSAGE))
        return
      }
      try {
        await reorderProjects(memberId, orderedIds)
      } catch (caught) {
        setProjectReorderError(toError(caught))
      }
    },
    [allMemberGroups, reorderProjects],
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
   * `isCompleted` は「完了にする / 未完了に戻す」のときだけ渡され、編集の保存と 1 回にまとめて保存する
   * （追加した案件は必ず未完了なので、追加のときは使わない）
   */
  const handleSaveProject = useCallback(
    async (input: TProjectInput, isCompleted?: boolean) => {
      if (sidePanelState.mode === "create") {
        await createProject(input)
      } else if (sidePanelState.mode === "edit") {
        await updateProject(sidePanelState.projectId, { ...input, isCompleted })
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
    // データ（memberGroups は画面に出すもの。allMemberGroups は完了済みも含めた全体）
    memberGroups,
    allMemberGroups,
    // 完了済みの案件の表示（保存しない見た目の設定。completedCount は完了済みの件数）
    completedVisibility: {
      isVisible: isCompletedVisible,
      completedCount,
      toggle: toggleCompletedVisible,
    },
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
