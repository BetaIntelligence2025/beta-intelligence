import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface PaginationProps {
  pageIndex: number
  totalCount: number
  perPage: number
  onPageChange: (pageIndex: number) => Promise<void> | void
  onPerPageChange?: (perPage: number) => void
}

export function Pagination({
  pageIndex,
  totalCount,
  perPage,
  onPageChange,
  onPerPageChange,
}: PaginationProps) {
  const [goToPageValue, setGoToPageValue] = useState<string>(String(pageIndex))
  
  const totalPages = Math.ceil(totalCount / perPage) || 1
  
  const handleGoToPage = () => {
    const pageNumber = parseInt(goToPageValue, 10)
    
    if (!isNaN(pageNumber) && pageNumber >= 1 && pageNumber <= totalPages) {
      onPageChange(pageNumber)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGoToPageValue(e.target.value)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleGoToPage()
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(pageIndex - 1)}
          disabled={pageIndex <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <span className="text-sm font-medium whitespace-nowrap">Página</span>
        
        <Input
          type="number"
          min={1}
          max={totalPages}
          value={goToPageValue}
          onChange={handleInputChange}
          onBlur={handleGoToPage}
          onKeyDown={handleKeyDown}
          className="h-8 w-14 text-center"
        />
        
        <span className="text-sm whitespace-nowrap">de {totalPages}</span>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(pageIndex + 1)}
          disabled={pageIndex >= totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex items-center gap-2">
        <Select
          value={String(perPage)}
          onValueChange={(value) => {
            if (onPerPageChange) {
              const newPerPage = parseInt(value, 10);
              onPerPageChange(newPerPage);
            }
          }}
        >
          <SelectTrigger className="h-8 min-w-[100px] w-auto border-none">
            <SelectValue>{perPage} linhas</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="100">100 linhas</SelectItem>
            <SelectItem value="500">500 linhas</SelectItem>
            <SelectItem value="1000">1000 linhas</SelectItem>
          </SelectContent>
        </Select>
        
        <span className="text-sm text-gray-500 whitespace-nowrap">{totalCount} registros</span>
      </div>
    </div>
  )
}
