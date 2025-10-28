import { Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

export function HomeHeader() {
  return (
    <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold text-foreground">Featured NPCs</h1>
        <HoverCard>
          <HoverCardTrigger asChild>
            <button type-="button" className="text-muted-foreground">
              <Info className="size-4" />
              <span className="sr-only">What are featured NPCs?</span>
            </button>
          </HoverCardTrigger>
          <HoverCardContent className="max-w-xs text-sm">
            All sorts of NPCs created by our community, from simple traders to detailed quest givers or powerful bosses.
          </HoverCardContent>
        </HoverCard>
      </div>
      <Button variant="ghost" className="gap-2" asChild>
        <a href="/npcs">
          Explore all NPCs
          <span aria-hidden>→</span>
        </a>
      </Button>
    </header>
  );
}
