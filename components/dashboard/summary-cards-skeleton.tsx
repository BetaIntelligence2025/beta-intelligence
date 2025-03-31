import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function SummaryCardsSkeleton() {
  return (
    <div className="overflow-hidden rounded-md border">
      <div className="grid space-y-2 md:grid-cols-2 lg:grid-cols-4 lg:space-y-0">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="rounded-none border-y-transparent border-s-transparent">
            <CardHeader className="relative flex flex-row items-center justify-between space-y-0">
              <CardTitle className="font-medium bg-gray-200 animate-pulse h-5 w-16 rounded" />
              <div className="absolute end-4 top-4 flex size-12 items-center justify-center rounded-full bg-gray-100 animate-pulse"></div>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-3xl font-bold">
                <div className="bg-gray-200 animate-pulse h-8 w-24 rounded" />
              </div>
              <p className="text-xs text-muted-foreground">
                <div className="bg-gray-200 animate-pulse h-4 w-32 rounded" />
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 