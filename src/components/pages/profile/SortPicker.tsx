import { Check, SlidersHorizontal } from "lucide-react";

import { SORT_OPTIONS } from "@/components/features/npc/list/config";
import { useNpcListContext } from "@/components/features/npc/list/NpcListProvider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function SortPicker() {
  const { sort, setSort } = useNpcListContext();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="inline-flex items-center gap-2">
          <SlidersHorizontal className="size-4" aria-hidden />
          <span>Sort</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-40">
        {SORT_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => setSort(option)}
            className="flex items-center justify-between gap-4"
          >
            <span>{option.label}</span>
            {sort.value === option.value ? <Check className="size-4" aria-hidden /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
