import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import { Button } from './ui/button'


interface PaginationProps {
  pageIndex: number
  totalCount: number
  perPage: number
  onPageChange: (pageIndex: number) => Promise<void> | void
}

export function Pagination({
  pageIndex,
  totalCount,
  perPage,
  onPageChange,
}: PaginationProps) {
  const pages = Math.ceil(totalCount / perPage) || 1

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">
        Total de {totalCount} item(s)
      </span>

      <div className="flex items-center gap-6 lg:gap-8">
        <div className="text-sm font-medium">
          Página {pageIndex} de {pages}
        </div>

        <Button
          onClick={() => onPageChange(1)}
          variant="outline"
          className="h-8 w-8 p-0"
          disabled={pageIndex === 1}
        >
          <ChevronsLeft className="h-4 w-4" />
          <span className="sr-only">Primeira página</span>
        </Button>

        <Button
          onClick={() => onPageChange(pageIndex - 1)}
          variant="outline"
          className="h-8 w-8 p-0"
          disabled={pageIndex === 1}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Página anterior</span>
        </Button>

        <Button
          onClick={() => onPageChange(pageIndex + 1)}
          variant="outline"
          className="h-8 w-8 p-0"
          disabled={pages <= pageIndex}
        >
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">Próxima página</span>
        </Button>

        <Button
          onClick={() => onPageChange(pages)}
          variant="outline"
          className="h-8 w-8 p-0"
          disabled={pages <= pageIndex}
        >
          <ChevronsRight className="h-4 w-4" />
          <span className="sr-only">Última página</span>
        </Button>
      </div>
    </div>
  )
}
