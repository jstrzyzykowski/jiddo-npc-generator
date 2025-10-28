import { Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function HomeHeader() {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-semibold text-foreground">Featured NPCs</h1>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className="text-muted-foreground transition-colors hover:text-foreground">
              <Info className="size-4" />
              <span className="sr-only">What are featured NPCs?</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" align="start">
            Discover community-curated NPCs ideal for inspiring your next storyline or encounter.
          </TooltipContent>
        </Tooltip>
      </div>
      <Button variant="ghost" className="gap-2 self-start sm:self-auto" asChild>
        <a href="/npcs">
          Explore all NPCs
          <span aria-hidden>→</span>
        </a>
      </Button>
    </header>
  );
}
