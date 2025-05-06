import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
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
  isLoading?: boolean
  onRefresh?: () => void
}

export function Pagination({
  pageIndex,
  totalCount,
  perPage,
  onPageChange,
  onPerPageChange,
  isLoading = false,
  onRefresh
}: PaginationProps) {
  const [goToPageValue, setGoToPageValue] = useState<string>(String(pageIndex))
  
  useEffect(() => {
    setGoToPageValue(String(pageIndex))
  }, [pageIndex])
  
  const totalPages = Math.ceil(totalCount / perPage) || 1
  
  const handleGoToPage = () => {
    if (isLoading) return
    
    const pageNumber = parseInt(goToPageValue, 10)
    
    if (!isNaN(pageNumber) && pageNumber >= 1 && pageNumber <= totalPages && pageNumber !== pageIndex) {
      onPageChange(pageNumber)
    } else {
      setGoToPageValue(String(pageIndex))
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
          onClick={() => {
            if (isLoading || pageIndex <= 1) return
            onPageChange(pageIndex - 1)
          }}
          disabled={pageIndex <= 1 || isLoading}
        >
          {isLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
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
          disabled={isLoading}
        />
        
        <span className="text-sm whitespace-nowrap">de {totalPages}</span>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => {
            if (isLoading || pageIndex >= totalPages) return
            onPageChange(pageIndex + 1)
          }}
          disabled={pageIndex >= totalPages || isLoading}
        >
          {isLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
        
        {onRefresh && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 ml-1"
            onClick={() => {
              if (isLoading) return
              onRefresh()
            }}
            disabled={isLoading}
            title="Atualizar sem mudar de página"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <Select
          value={String(perPage)}
          onValueChange={(value) => {
            if (onPerPageChange && !isLoading) {
              try {
              const newPerPage = parseInt(value, 10);
                if (newPerPage > 0) {
                  setTimeout(() => {
              onPerPageChange(newPerPage);
                  }, 50);
                }
              } catch (error) {
                console.error('Error changing page size:', error);
              }
            }
          }}
          disabled={isLoading}
        >
          <SelectTrigger className="h-8 min-w-[100px] w-auto">
            <SelectValue>{perPage} linhas</SelectValue>
          </SelectTrigger>
          <SelectContent align="center">
            <SelectItem value="10">10 linhas</SelectItem>
            <SelectItem value="25">25 linhas</SelectItem>
            <SelectItem value="50">50 linhas</SelectItem>
            <SelectItem value="100">100 linhas</SelectItem>
            <SelectItem value="500">500 linhas</SelectItem>
            <SelectItem value="1000">1000 linhas</SelectItem>
            <SelectItem value="5000">5000 linhas</SelectItem>
          </SelectContent>
        </Select>
        
        <span className="text-sm text-gray-500 whitespace-nowrap">
          {isLoading ? 'Carregando...' : `${totalCount} registros`}
        </span>
      </div>
    </div>
  )
}
