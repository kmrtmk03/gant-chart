import type { IDayColumn } from "../../gantt.utils"
import styles from "./TimelineGrid.module.scss"
import { useTimelineGrid } from "./useTimelineGrid"

interface ITimelineGridProps {
  columns: IDayColumn[]
}

/** タイムラインの背景の縦線。土日祝の列には背景色を付ける。操作は受け付けない */
export function TimelineGrid({ columns }: ITimelineGridProps) {
  const { gridColumns } = useTimelineGrid({ columns })

  return (
    <div className={styles.grid} aria-hidden>
      {gridColumns.map((column) => (
        <div
          key={column.key}
          className={column.className}
          style={{ width: column.width }}
        />
      ))}
    </div>
  )
}
