import type { CSSProperties, MouseEvent } from "react"

import {
  DATE_HEADER_DAY_ROW_HEIGHT,
  DATE_HEADER_MONTH_ROW_HEIGHT,
  DAY_COLUMN_WIDTH,
} from "../../gantt.constants"
import { useGanttPage } from "../../hooks/useGanttPage"

/**
 * 押してもサイドパネルを閉じない要素。帯・左のリストのボタン類（案件名・追加・開閉・つかみ）は、
 * いずれも `button` で、帯の伸縮のつかみは帯（`button`）の中にある。
 * チャートの上で独自の操作を持つ要素を足すときは、ここに追加すること
 */
const KEEP_SIDE_PANEL_SELECTOR = "button, a, input, select, textarea"

/**
 * `GanttChart` 専用のフック。ページ全体のフック（`useGanttPage`）の結果から、
 * 画面の状態（エラー / 読み込み中 / 表示可）と、描画にそのまま使える値を組み立てて返す。
 *
 * 戻り値の `status` が "ready" のときだけ、チャートの値がそろっている（型でも絞り込まれる）。
 * localStorage と今日の日付はブラウザでしか決まらないので、そろうまでは "loading" になる。
 */
export function useGanttChart() {
  const page = useGanttPage()
  const {
    memberGroups,
    allMemberGroups,
    completedVisibility,
    range,
    sidePanel,
    scroll,
    memberManagement,
    barDrag,
    projectReorder,
  } = page

  if (page.loadError) {
    return {
      status: "error" as const,
      loadErrorMessage: page.loadError.message,
      retryLoad: page.retryLoad,
    }
  }

  if (
    memberGroups === null ||
    allMemberGroups === null ||
    range.rangeStart === null ||
    range.today === null ||
    range.columns === null
  ) {
    return { status: "loading" as const }
  }

  const { rangeStart, rangeDays, today, columns } = range

  // サイドパネルを出すか。追加のときは常に出し、編集のときは案件が見つかるときだけ出す
  const { state: sidePanelState, editingProject } = sidePanel
  const isSidePanelVisible =
    sidePanelState.mode === "create" ||
    (sidePanelState.mode === "edit" && editingProject !== null)
  // key は、別の案件・別の担当者で開き直したときにフォームを作り直すためのもの。
  // MEMO: 編集中の案件の帯はドラッグできない（useProjectBar）ので、期間がパネルの外で変わることはない
  const sidePanelKey =
    sidePanelState.mode === "create"
      ? `create:${sidePanelState.defaultMemberId ?? ""}`
      : `edit:${editingProject?.id ?? ""}`

  // スクロール領域の何もないところ（帯のない行・日付ヘッダー・左リストの空き）のクリックで、パネルを閉じる。
  // 入力途中でも確認せずに閉じる（Esc・✕ と同じ扱い）。ヘッダーはスクロール領域の外なので対象にならない。
  // 保存・削除の実行中は、`sidePanel.close` 側（useSidePanel）が閉じる操作を受け付けない
  const handleScrollAreaClick = (event: MouseEvent<HTMLElement>) => {
    if (!isSidePanelVisible) return
    if (
      event.target instanceof Element &&
      event.target.closest(KEEP_SIDE_PANEL_SELECTOR) !== null
    ) {
      return
    }
    sidePanel.close()
  }

  // 左上の角の高さは、日付ヘッダー（月の行 + 日の行）に合わせる
  const cornerStyle: CSSProperties = {
    height: DATE_HEADER_MONTH_ROW_HEIGHT + DATE_HEADER_DAY_ROW_HEIGHT,
  }
  // 1 列目は左リスト、2 列目はタイムライン。タイムラインの幅は表示期間の日数で決まる。
  // 左リストの幅は画面の幅で変わる（狭い画面では縮める）ので、CSS 変数（_tokens.scss / globals.scss）で受ける
  const gridStyle: CSSProperties = {
    gridTemplateColumns: `var(--member-list-width) ${rangeDays * DAY_COLUMN_WIDTH}px`,
  }

  return {
    status: "ready" as const,
    // 描画用のスタイル
    cornerStyle,
    gridStyle,
    // 担当者が 0 人のときは、チャートの代わりに空の画面を出す
    isEmpty: memberGroups.length === 0,
    emptyState: {
      canSeedSampleData: page.canSeedSampleData,
      isSeeding: page.isSeeding,
      seedErrorMessage: page.seedError?.message ?? null,
      seedSampleData: page.seedSampleData,
    },
    // データ・表示期間（memberGroups は画面に出すもの。担当者の管理ダイアログには完了済みも含めた allMemberGroups を渡す）
    memberGroups,
    allMemberGroups,
    columns,
    rangeStart,
    rangeDays,
    today,
    // 画面上部のバー（visibleDate は未確定の間、今日で代用する）
    header: {
      visibleDate: scroll.visibleDate ?? today,
      scrollBackward: scroll.scrollBackward,
      scrollForward: scroll.scrollForward,
      scrollToToday: scroll.scrollToToday,
      isCompletedVisible: completedVisibility.isVisible,
      completedCount: completedVisibility.completedCount,
      toggleCompletedVisible: completedVisibility.toggle,
    },
    // スクロール領域に渡すもの
    scrollArea: {
      attachScroller: scroll.attachScroller,
      handleScroll: scroll.handleScroll,
      handleClick: handleScrollAreaClick,
    },
    // 折りたたみ・ボタンの操作
    collapsedMemberIds: page.collapsedMemberIds,
    toggleMember: page.toggleMember,
    addProject: page.addProject,
    manageMembers: page.manageMembers,
    // 帯のドラッグ（期間の保存と、失敗したときのエラー表示）
    barDrag: {
      changePeriod: barDrag.changePeriod,
      errorMessage: barDrag.error?.message ?? null,
      dismissError: barDrag.dismissError,
    },
    // 左のリストでの案件の並び替え（並びの保存と、失敗したときのエラー表示）
    projectReorder: {
      reorder: projectReorder.reorder,
      errorMessage: projectReorder.error?.message ?? null,
      dismissError: projectReorder.dismissError,
    },
    // 担当者の管理ダイアログ
    memberDialog: {
      isOpen: memberManagement.isDialogOpen,
      create: memberManagement.createMember,
      rename: memberManagement.renameMember,
      reorder: memberManagement.reorderMembers,
      remove: memberManagement.deleteMember,
      close: memberManagement.closeDialog,
    },
    // サイドパネル
    sidePanel: {
      isVisible: isSidePanelVisible,
      panelKey: sidePanelKey,
      members: sidePanel.members,
      project: editingProject,
      editingProjectId: editingProject?.id ?? null,
      defaultMemberId:
        sidePanelState.mode === "create"
          ? sidePanelState.defaultMemberId
          : null,
      selectProject: sidePanel.selectProject,
      save: sidePanel.save,
      remove: sidePanel.remove,
      close: sidePanel.close,
    },
  }
}
