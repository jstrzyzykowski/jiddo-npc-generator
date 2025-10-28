import type { PropsWithChildren } from "react";

import { cn } from "@/lib/utils";

interface NpcGridProps extends PropsWithChildren {
  isAuthenticated: boolean;
}

export function NpcGrid({ isAuthenticated, children }: NpcGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4",
        !isAuthenticated && "[&>*:first-child]:sm:col-span-2 [&>*:first-child]:lg:col-span-2"
      )}
    >
      {children}
    </div>
  );
}
