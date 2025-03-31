export default function VisualizationSkeleton() {
  return (
    <div className="overflow-hidden rounded-md border">
      <div className="p-4">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded mb-4" />
        <div className="aspect-[21/9] w-full bg-gray-200 animate-pulse rounded" />
      </div>
    </div>
  );
} 