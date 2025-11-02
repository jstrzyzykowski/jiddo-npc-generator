import { AlertCircle, RefreshCcw, SearchX } from "lucide-react";

import { NpcCard } from "@/components/pages/home/NpcCard";
import { InfiniteScrollTrigger } from "@/components/shared/InfiniteScrollTrigger";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import type { NpcListItemDto } from "@/types";

import type { NpcListStatus } from "./useNpcList";

interface NpcGridProps {
  items: NpcListItemDto[];
  status: NpcListStatus;
  error: Error | null;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => Promise<void> | void;
  onRetry: () => Promise<void> | void;
  onRefresh?: () => Promise<void> | void;
}

export function NpcGrid({
  items,
  status,
  error,
  hasMore,
  isLoading,
  isLoadingMore,
  onLoadMore,
  onRetry,
  onRefresh,
}: NpcGridProps) {
  const showInitialSkeleton = isLoading && items.length === 0;
  const showInitialError = status === "error" && items.length === 0;
  const showEmpty = status === "success" && items.length === 0;

  const gridColsClass = "grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";

  return (
    <div className="flex flex-col gap-6">
      {showInitialSkeleton ? <SkeletonGrid gridClassName={gridColsClass} /> : null}

      {showInitialError ? <ErrorState message={error?.message} onRetry={onRetry} /> : null}

      {showEmpty ? <EmptyState /> : null}

      <div className={gridColsClass}>
        {items.map((npc) => (
          <NpcCard key={npc.id} npc={npc} className="h-[392px]" onRefresh={onRefresh} />
        ))}
      </div>

      {status === "error" && items.length > 0 ? <InlineError message={error?.message} onRetry={onRetry} /> : null}

      {isLoadingMore ? <SkeletonLoaderRow gridClassName={gridColsClass} /> : null}

      <InfiniteScrollTrigger
        disabled={!hasMore || isLoading || isLoadingMore || status === "error"}
        onTrigger={onLoadMore}
      />
    </div>
  );
}

function SkeletonGrid({ gridClassName }: { gridClassName: string }) {
  return (
    <div className={gridClassName}>
      {Array.from({ length: 8 }).map((_, index) => (
        <Skeleton key={index} className="h-[392px] w-full rounded-xl" />
      ))}
    </div>
  );
}

function SkeletonLoaderRow({ gridClassName }: { gridClassName: string }) {
  return (
    <div className={gridClassName}>
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-[392px] w-full rounded-xl" />
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message?: string; onRetry: () => Promise<void> | void }) {
  return (
    <Empty className="border border-dashed border-border/60 bg-muted/30">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <AlertCircle aria-hidden className="size-6" />
        </EmptyMedia>
        <EmptyTitle>Unable to load NPC list</EmptyTitle>
        <EmptyDescription>{message ?? "Please try again later."}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" size="sm" onClick={() => void onRetry()}>
          <RefreshCcw className="size-4" aria-hidden />
          Retry
        </Button>
      </EmptyContent>
    </Empty>
  );
}

function InlineError({ message, onRetry }: { message?: string; onRetry: () => Promise<void> | void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
      <div className="flex items-center gap-2">
        <AlertCircle className="size-4" aria-hidden="true" />
        <span>{message ?? "An error occurred while loading more items."}</span>
      </div>
      <Button variant="outline" size="sm" onClick={() => void onRetry()}>
        Try again
      </Button>
    </div>
  );
}
function EmptyState() {
  return (
    <Empty className="border border-dashed border-border/60 bg-muted/30">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchX aria-hidden className="size-6" />
        </EmptyMedia>
        <EmptyTitle>No NPCs match your current filters</EmptyTitle>
        <EmptyDescription>Adjust the filters or try again later.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
