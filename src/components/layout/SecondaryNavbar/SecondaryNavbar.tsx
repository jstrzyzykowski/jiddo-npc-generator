import { Home, Layers3, SlidersHorizontal, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { SORT_OPTIONS } from "@/components/features/npc/list/config";
import { useOptionalNpcListContext } from "@/components/features/npc/list/NpcListProvider";

interface SecondaryNavbarProps {
  currentPath: string;
}

export function SecondaryNavbar({ currentPath }: SecondaryNavbarProps) {
  const npcListContext = useOptionalNpcListContext();
  const selectedSortLabel = npcListContext?.sort.label ?? "Sort";
  const showSortControls = !!npcListContext;

  return (
    <nav aria-label="Secondary navigation" className="sticky top-[65px] z-30 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-12 w-full max-w-[1200px] items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <a
            href="/"
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-3 py-1.5 transition-colors",
              currentPath === "/" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Home className="size-4" />
            Home
          </a>
          <a
            href="/npcs"
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-3 py-1.5 transition-colors",
              currentPath.startsWith("/npcs")
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Layers3 className="size-4" />
            NPCs
          </a>
        </div>

        {showSortControls ? (
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <SlidersHorizontal className="size-4" />
                  {selectedSortLabel}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {SORT_OPTIONS.map((option) => {
                  const isActive = npcListContext?.sort.value === option.value;

                  return (
                    <DropdownMenuItem
                      key={option.value}
                      onSelect={(event) => {
                        event.preventDefault();
                        if (!npcListContext) {
                          return;
                        }

                        npcListContext.setSort(option);
                      }}
                      className={cn("flex items-center gap-2", isActive ? "font-semibold" : undefined)}
                    >
                      {option.label}
                      {isActive ? <Check className="ml-auto size-4" aria-hidden="true" /> : null}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null}
      </div>
    </nav>
  );
}
