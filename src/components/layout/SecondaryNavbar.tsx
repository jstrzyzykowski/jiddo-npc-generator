import { useMemo } from "react";
import { Home, Layers3, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface SecondaryNavbarProps {
  currentPath: string;
  isVisible: boolean;
}

export function SecondaryNavbar({ currentPath, isVisible }: SecondaryNavbarProps) {
  const isNpcPage = currentPath.startsWith("/npcs");

  const sortOptions = useMemo(
    () => [
      { label: "Newest", value: "published_at:desc" },
      { label: "Oldest", value: "published_at:asc" },
    ],
    []
  );

  return (
    <nav
      aria-label="Secondary navigation"
      className={cn(
        "sticky top-16 z-30 border-b bg-background/95 backdrop-blur transition-transform duration-300",
        isVisible ? "translate-y-0" : "-translate-y-full"
      )}
    >
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

        {isNpcPage ? (
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <SlidersHorizontal className="size-4" />
                  Sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {sortOptions.map((option) => (
                  <DropdownMenuItem key={option.value}>{option.label}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled>This week</DropdownMenuItem>
                <DropdownMenuItem disabled>This month</DropdownMenuItem>
                <DropdownMenuItem disabled>This year</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null}
      </div>
    </nav>
  );
}
