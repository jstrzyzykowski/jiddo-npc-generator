import { HomeHeader } from "./HomeHeader";
import { FeaturedInfoPanel } from "./FeaturedInfoPanel";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import { NpcCard } from "./NpcCard";
import { NpcGrid } from "./NpcGrid";
import { NpcPlaceholderCard } from "./NpcPlaceholderCard";
import { NpcSkeletonCard } from "./NpcSkeletonCard";
import { useFeaturedNpcs } from "@/hooks/useFeaturedNpcs";

const PLACEHOLDER_COUNT = 6;

export default function HomePage() {
  const { npcs, isLoading, error, isAuthenticated, retry } = useFeaturedNpcs();

  const showEmptyState = !isLoading && !error && (npcs === null || npcs.length === 0);

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-10">
      {isAuthenticated ? <HomeHeader /> : null}

      {error ? (
        <ErrorState onRetry={retry} />
      ) : (
        <NpcGrid isAuthenticated={isAuthenticated}>
          {!isAuthenticated ? <FeaturedInfoPanel /> : null}

          {isLoading ? (
            Array.from({ length: isAuthenticated ? 8 : PLACEHOLDER_COUNT }).map((_, index) => (
              <NpcSkeletonCard key={`skeleton-${index}`} />
            ))
          ) : showEmptyState ? (
            <>
              <EmptyState />
              {Array.from({ length: getRemainingSlots(0, isAuthenticated) }).map((_, index) => (
                <NpcPlaceholderCard key={`empty-slot-${index}`} label="Reserved for upcoming hero" />
              ))}
            </>
          ) : (
            <>
              {npcs?.map((npc) => (
                <NpcCard key={npc.id} npc={npc} showActions={false} showInfoHover={false} />
              ))}
              {Array.from({ length: getRemainingSlots(npcs?.length ?? 0, isAuthenticated) }).map((_, index) => (
                <NpcPlaceholderCard key={`slot-${index}`} label="More featured NPC soon" />
              ))}
            </>
          )}
        </NpcGrid>
      )}
    </div>
  );
}

function getRemainingSlots(currentCount: number, isAuthenticated: boolean): number {
  const target = isAuthenticated ? 8 : 6;
  return Math.max(target - currentCount, 0);
}
