import { AlertCircle } from "lucide-react";

import { NpcCard } from "@/components/pages/home/NpcCard";
import { InfiniteScrollTrigger } from "@/components/shared/InfiniteScrollTrigger";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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

  return (
    <div className="flex flex-col gap-6">
      {showInitialSkeleton ? <SkeletonGrid /> : null}

      {showInitialError ? <ErrorState message={error?.message} onRetry={onRetry} /> : null}

      {showEmpty ? <EmptyState /> : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {items.map((npc) => (
          <NpcCard key={npc.id} npc={npc} className="h-[392px]" onRefresh={onRefresh} />
        ))}
      </div>

      {status === "error" && items.length > 0 ? <InlineError message={error?.message} onRetry={onRetry} /> : null}

      {isLoadingMore ? <SkeletonLoaderRow /> : null}

      <InfiniteScrollTrigger
        disabled={!hasMore || isLoading || isLoadingMore || status === "error"}
        onTrigger={onLoadMore}
      />
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <Skeleton key={index} className="h-[392px] w-full rounded-xl" />
      ))}
    </div>
  );
}

function SkeletonLoaderRow() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-[392px] w-full rounded-xl" />
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message?: string; onRetry: () => Promise<void> | void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-destructive/40 bg-destructive/5 px-6 py-10 text-center">
      <AlertCircle className="size-10 text-destructive" aria-hidden="true" />
      <div className="space-y-2">
        <p className="text-lg font-semibold text-destructive">Nie udało się pobrać listy NPC.</p>
        <p className="text-sm text-destructive/80">{message ?? "Spróbuj ponownie za chwilę."}</p>
      </div>
      <Button variant="destructive" onClick={() => void onRetry()}>
        Spróbuj ponownie
      </Button>
    </div>
  );
}

function InlineError({ message, onRetry }: { message?: string; onRetry: () => Promise<void> | void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
      <div className="flex items-center gap-2">
        <AlertCircle className="size-4" aria-hidden="true" />
        <span>{message ?? "Wystąpił błąd podczas ładowania kolejnej strony."}</span>
      </div>
      <Button variant="outline" size="sm" onClick={() => void onRetry()}>
        Spróbuj ponownie
      </Button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border/60 bg-muted/30 px-6 py-10 text-center">
      <p className="text-lg font-semibold text-foreground">Brak opublikowanych NPC dla wybranych filtrów.</p>
      <p className="text-sm text-muted-foreground">Zmień kryteria filtrowania lub spróbuj ponownie później.</p>
    </div>
  );
}
