import { useEffect, useMemo } from "react";

import { NpcListProvider } from "@/components/features/npc/list/NpcListProvider";
import { FilterTags } from "@/components/features/npc/list/FilterTags";
import { NpcGrid } from "@/components/features/npc/list/NpcGrid";
import { useNpcList } from "@/components/features/npc/list/useNpcList";
import { DEFAULT_FILTER, DEFAULT_SORT } from "@/components/features/npc/list/config";
import type { GetNpcListResponseDto, ProfileNpcCountsDto } from "@/types";
import { toast } from "sonner";

import type { TabKey } from "./NpcTabs";
import { SortPicker } from "./SortPicker";

const EMPTY_RESPONSE: GetNpcListResponseDto = {
  items: [],
  pageInfo: { nextCursor: null, total: null },
};

interface NpcsSectionProps {
  tab: TabKey;
  counts?: ProfileNpcCountsDto | null;
}

export function NpcsSection({ tab, counts }: NpcsSectionProps) {
  return (
    <NpcListProvider initialSort={DEFAULT_SORT} initialFilter={DEFAULT_FILTER}>
      <NpcsSectionInner tab={tab} counts={counts} />
    </NpcListProvider>
  );
}

function NpcsSectionInner({ tab }: NpcsSectionProps) {
  const overrides = useMemo(() => {
    return {
      visibility: "mine" as const,
      status: tab === "drafts" ? ("draft" as const) : ("published" as const),
      limit: 24,
    };
  }, [tab]);

  const { items, status, error, hasMore, isLoading, isLoadingMore, refresh, loadMore } = useNpcList({
    initialData: EMPTY_RESPONSE,
    initialError: null,
    overrides,
    fetchOnMount: true,
  });

  useEffect(() => {
    if (status === "error" && error?.message) {
      toast.error(error.message);
    }
  }, [status, error]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <FilterTags />
        <SortPicker />
      </div>

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
        variant="profile"
      />
    </div>
  );
}
