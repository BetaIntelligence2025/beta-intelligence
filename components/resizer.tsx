import { useEffect, useRef } from 'react'
import { useTableStore, type ColumnId } from '@/app/stores/use-table-store'
import { GripVertical } from 'lucide-react'

interface ResizerProps {
  columnId: ColumnId
  onResize?: (width: number) => void
}

export function Resizer({ columnId, onResize }: ResizerProps) {
  const {
    columnWidths,
    isResizing,
    activeResizer,
    startResizing,
    stopResizing,
    setColumnWidth,
    setIsResizing,
  } = useTableStore()
  
  const resizerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    startX: number
    startWidth: number
    isDragging: boolean
  } | null>(null)

  useEffect(() => {
    const resizer = resizerRef.current
    if (!resizer) return

    function onMouseDown(e: MouseEvent) {
      e.preventDefault()
      e.stopPropagation()
      
      dragRef.current = {
        startX: e.clientX,
        startWidth: columnWidths[columnId],
        isDragging: true
      }
      
      startResizing(columnId, columnWidths[columnId])
      setIsResizing(true)
      
      // Adiciona uma stylesheet temporária para forçar o cursor
      const style = document.createElement('style')
      style.innerHTML = `
        * {
          cursor: col-resize !important;
          user-select: none !important;
        }
      `
      document.head.appendChild(style)
      
      // Cria um overlay transparente para capturar os eventos do mouse
      const overlay = document.createElement('div')
      overlay.style.position = 'fixed'
      overlay.style.top = '0'
      overlay.style.right = '0'
      overlay.style.bottom = '0'
      overlay.style.left = '0'
      overlay.style.zIndex = '9999'
      overlay.style.cursor = 'col-resize'
      overlay.style.userSelect = 'none'
      overlay.style.pointerEvents = 'all'
      document.body.appendChild(overlay)

      function onMouseMove(e: MouseEvent) {
        if (!dragRef.current?.isDragging) return
        
        e.preventDefault()
        e.stopPropagation()
        
        const delta = e.clientX - dragRef.current.startX
        const newWidth = Math.max(80, Math.min(500, dragRef.current.startWidth + delta))
        
        requestAnimationFrame(() => {
          setColumnWidth(columnId, newWidth)
          onResize?.(newWidth)
        })
      }

      function onMouseUp() {
        dragRef.current = null
        setIsResizing(false)
        document.head.removeChild(style)
        document.body.removeChild(overlay)
        stopResizing()
        
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
      }

      document.addEventListener('mousemove', onMouseMove, { capture: true })
      document.addEventListener('mouseup', onMouseUp, { once: true })
    }

    resizer.addEventListener('mousedown', onMouseDown)

    return () => {
      resizer.removeEventListener('mousedown', onMouseDown)
    }
  }, [columnId, columnWidths, startResizing, stopResizing, setColumnWidth, setIsResizing, onResize])

  return (
    <div
      ref={resizerRef}
      className={`
        absolute right-0 top-0 h-full w-4
        cursor-col-resize select-none
        flex items-center justify-center
        opacity-0 hover:opacity-100
        ${isResizing && activeResizer === columnId ? 'opacity-100' : ''}
        transition-opacity duration-150
      `}
      style={{
        transform: 'translateX(50%)',
        touchAction: 'none',
        zIndex: isResizing && activeResizer === columnId ? 50 : 'auto',
      }}
    >
      <GripVertical 
        className={`h-4 w-4 text-gray-400
          ${isResizing && activeResizer === columnId ? 'text-gray-600' : ''}
        `}
      />
    </div>
  )
}