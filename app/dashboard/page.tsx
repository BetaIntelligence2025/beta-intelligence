"use client"

import { PageHeader } from "@/components/page-header";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/utils/supabase/client";
import { redirect } from "next/navigation";
import { DashboardTableSkeleton } from "./dashboard-table-skeleton";
import { DashboardTableRow } from "./dashboard-table-row";
import { Pagination } from "@/components/pagination";
import { usePagination } from "@/hooks/use-pagination";
import { DashboardTable } from "./dashboard-table";

export default function ProtectedPage() {
  const supabase = createClient();
  const { pageIndex, handlePaginate } = usePagination()
  const user = supabase.auth.getUser()

  if (!user) {
    return redirect("/sign-in");
  }
  const isLoading = false;
  const result = {
    user: [{
      userId: '1',
      fullName: "John Doe",
      phone: "123456789",
      fbc: "Facebook",
      fbp: "Facebook Pixel",
      createdAt: new Date().toDateString(),
      initialCountry: "USA",
      initialCountryCode: "US",
      initialRegion: "California",
      initialCity: "San Francisco",
      additionalProperty1: "value1",
      additionalProperty2: "value2",
      additionalProperty3: "value3",
      additionalProperty4: "value4",
      initialZip: "94103",
      initialIp: "192.168.1.1",
      userAgent: "Mozilla/5.0",
      initialReferrer: "https://example.com",
      timezone: "PST",
    }]
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-12">
      <div className="w-full">
        <PageHeader pageTitle="Dashboard" />
      </div>
      <div className="space-y-4 rounded-md border bg-white p-4 shadow-sm xl:space-y-6">
      <DashboardTable isLoading={isLoading} result={result} />
          {result && (
            <Pagination
              onPageChange={handlePaginate}
              pageIndex={1}
              totalCount={result.user.length}
              perPage={result.user.length}
            />
          )}
      </div>
    </div>
  );
}
