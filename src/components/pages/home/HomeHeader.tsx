import { ArrowRightIcon, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

export function HomeHeader() {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-foreground">Featured NPCs</h1>
        <HoverCard openDelay={0} closeDelay={0}>
          <HoverCardTrigger asChild>
            <button type="button" className="text-muted-foreground transition-colors hover:text-foreground">
              <Info className="size-5" />
              <span className="sr-only">What are featured NPCs?</span>
            </button>
          </HoverCardTrigger>
          <HoverCardContent side="top" className="max-w-xs text-sm">
            Discover community-curated NPCs ideal for inspiring your next storyline or encounter.
          </HoverCardContent>
        </HoverCard>
      </div>
      <Button variant="ghost" className="gap-2 self-start sm:self-auto" asChild>
        <a href="/npcs">
          Explore all NPCs
          <ArrowRightIcon className="size-4" />
        </a>
      </Button>
    </header>
  );
}
