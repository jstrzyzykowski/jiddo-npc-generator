import { NpcSkeletonCard } from "@/components/pages/home/NpcSkeletonCard";
import { Skeleton } from "@/components/ui/skeleton";

export function NpcsPageSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-10">
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-20 rounded-md" />
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-9 w-20 rounded-md" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <NpcSkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
