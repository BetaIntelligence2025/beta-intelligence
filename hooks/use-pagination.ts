"use client"

import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { z } from "zod"
import { useCallback } from "react"

interface UsePaginationResponse {
  pageIndex: number
  handlePaginate: (pageIndex: number) => void
}

export function usePagination(): UsePaginationResponse {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const pageIndex = z.coerce
    .number()
    .min(1)
    .parse(searchParams.get("page") ?? "1")

  const handlePaginate = useCallback(
    (newPageIndex: number) => {
      const params = new URLSearchParams(searchParams)
      params.set("page", newPageIndex.toString())
      router.push(`${pathname}?${params.toString()}`)
    },
    [searchParams, router, pathname],
  )

  return {
    pageIndex,
    handlePaginate,
  }
}