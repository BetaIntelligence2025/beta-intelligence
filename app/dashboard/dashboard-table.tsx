"use client"

import { Table, TableBody } from "@/components/ui/table"
import { DashboardTableSkeleton } from "./dashboard-table-skeleton"
import { DashboardTableRow } from "./dashboard-table-row"
import { ColumnManagementModal } from "./column-management-modal"
import { type ColumnId, useColumnsStore } from "@/stores/use-columns-store"
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type React from "react"
import { useRef } from "react"

function SortableHeader({ columnId, children }: { columnId: ColumnId; children: React.ReactNode }) {
  const { attributes, listeners, transform, transition, setNodeRef, isDragging } = useSortable({ id: columnId })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 999 : "auto",
    opacity: isDragging ? 0.5 : 1,
    cursor: "move",
  }

  return (
    <th
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="h-10 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0"
    >
      {children}
    </th>
  )
}

function TableHeaders({ visibleColumns }: { visibleColumns: ColumnId[] }) {
  return (
    <thead className="[&_tr]:border-b">
      <tr>
        {visibleColumns.map((columnId) => (
          <SortableHeader key={columnId} columnId={columnId}>
            {columnId === "id" && "ID"}
            {columnId === "name" && "Nome"}
            {columnId === "phone" && "Telefone"}
            {columnId === "fbc" && "FBC"}
            {columnId === "fbp" && "FBP"}
            {columnId === "createdAt" && "Captação em"}
            {columnId === "actions" && ""}
          </SortableHeader>
        ))}
      </tr>
    </thead>
  )
}

export function DashboardTable({ isLoading, result }: { isLoading: boolean; result: any }) {
  const { visibleColumns, setVisibleColumns } = useColumnsStore()
  const tableRef = useRef<HTMLTableElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = visibleColumns.indexOf(active.id as ColumnId)
      const newIndex = visibleColumns.indexOf(over.id as ColumnId)

      const newOrder = arrayMove(visibleColumns, oldIndex, newIndex)
      setVisibleColumns(newOrder)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ColumnManagementModal />
      </div>

      <div className="relative rounded-md border">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={visibleColumns} strategy={horizontalListSortingStrategy}>
            <Table ref={tableRef}>
              <TableHeaders visibleColumns={visibleColumns} />
              <TableBody>
                {isLoading && <DashboardTableSkeleton />}
                {result?.user?.map((user: any) => (
                  <DashboardTableRow key={user.userId} user={user} visibleColumns={visibleColumns} />
                ))}
              </TableBody>
            </Table>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  )
}