import type { CSSProperties } from "react"

import {
  DATE_HEADER_DAY_ROW_HEIGHT,
  DATE_HEADER_MONTH_ROW_HEIGHT,
  DAY_COLUMN_WIDTH,
  MEMBER_LIST_WIDTH,
} from "../../gantt.constants"
import { useGanttPage } from "../../hooks/useGanttPage"

/**
 * `GanttChart` 専用のフック。ページ全体のフック（`useGanttPage`）の結果から、
 * 画面の状態（エラー / 読み込み中 / 表示可）と、描画にそのまま使える値を組み立てて返す。
 *
 * 戻り値の `status` が "ready" のときだけ、チャートの値がそろっている（型でも絞り込まれる）。
 * localStorage と今日の日付はブラウザでしか決まらないので、そろうまでは "loading" になる。
 */
export function useGanttChart() {
  const page = useGanttPage()
  const { memberGroups, range, sidePanel, scroll, memberManagement } = page

  if (page.loadError) {
    return {
      status: "error" as const,
      loadErrorMessage: page.loadError.message,
      retryLoad: page.retryLoad,
    }
  }

  if (
    memberGroups === null ||
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
  // key は、別の案件・別の担当者で開き直したときにフォームを作り直すためのもの
  const sidePanelKey =
    sidePanelState.mode === "create"
      ? `create:${sidePanelState.defaultMemberId ?? ""}`
      : `edit:${editingProject?.id ?? ""}`

  // 左上の角の高さは、日付ヘッダー（月の行 + 日の行）に合わせる
  const cornerStyle: CSSProperties = {
    height: DATE_HEADER_MONTH_ROW_HEIGHT + DATE_HEADER_DAY_ROW_HEIGHT,
  }
  // 1 列目は左リスト、2 列目はタイムライン。幅は表示期間の日数で決まる
  const gridStyle: CSSProperties = {
    gridTemplateColumns: `${MEMBER_LIST_WIDTH}px ${rangeDays * DAY_COLUMN_WIDTH}px`,
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
    // データ・表示期間
    memberGroups,
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
    },
    // スクロール領域に渡すもの
    scrollArea: {
      attachScroller: scroll.attachScroller,
      handleScroll: scroll.handleScroll,
    },
    // 折りたたみ・ボタンの操作
    collapsedMemberIds: page.collapsedMemberIds,
    toggleMember: page.toggleMember,
    addProject: page.addProject,
    manageMembers: page.manageMembers,
    // 担当者の管理ダイアログ
    memberDialog: {
      isOpen: memberManagement.isDialogOpen,
      create: memberManagement.createMember,
      rename: memberManagement.renameMember,
      move: memberManagement.moveMember,
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
