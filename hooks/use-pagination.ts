"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { z } from "zod";
import { useCallback, useEffect, useState } from "react";

interface UsePaginationResponse {
  pageIndex: number;
  handlePaginate: (pageIndex: number) => void;
}

export function usePagination(): UsePaginationResponse {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // 🔹 Estado local para garantir que a página sempre seja atualizada corretamente
  const [pageIndex, setPageIndex] = useState(
    z.coerce.number().min(1).parse(searchParams.get("page") ?? "1")
  );

  // 🔹 Atualiza `pageIndex` sempre que a URL muda
  useEffect(() => {
    const newPageIndex = z.coerce.number().min(1).parse(searchParams.get("page") ?? "1");
    setPageIndex(newPageIndex);
  }, [searchParams]);

  const handlePaginate = useCallback(
    (newPageIndex: number) => {
      const params = new URLSearchParams(searchParams);
      params.set("page", newPageIndex.toString());

      // 🔹 Usa `replace` para evitar que a página recarregue completamente
      router.replace(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname]
  );

  return {
    pageIndex,
    handlePaginate,
  };
}
