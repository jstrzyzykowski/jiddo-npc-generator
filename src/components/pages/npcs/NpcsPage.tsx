import type { AppShellProps } from "@/components/AppShell";
import type { FilterTag, SortOption } from "@/components/features/npc/list/config";
import { FilterTags } from "@/components/features/npc/list/FilterTags";
import { NpcGrid } from "@/components/features/npc/list/NpcGrid";
import { useNpcList } from "@/components/features/npc/list/useNpcList";
import type { GetNpcListResponseDto } from "@/types/npc";

export interface NpcsPageProps extends AppShellProps {
  initialSort: SortOption;
  initialFilter: FilterTag;
  initialData: GetNpcListResponseDto;
  initialError: string | null;
}

export default function NpcsPage({ initialData, initialError }: NpcsPageProps) {
  const { items, status, error, hasMore, isLoading, isLoadingMore, refresh, loadMore } = useNpcList({
    initialData,
    initialError,
  });

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-10">
      <FilterTags />

      <NpcGrid
        items={items}
        status={status}
        error={error}
        hasMore={hasMore}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        onLoadMore={loadMore}
        onRetry={refresh}
        onRefresh={refresh}
      />
    </div>
  );
}
