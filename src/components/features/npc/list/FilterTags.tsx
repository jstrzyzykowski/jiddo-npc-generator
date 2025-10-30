import { FILTER_TAGS } from "./config";
import { useNpcListContext } from "./NpcListProvider";
import { Button } from "@/components/ui/button";

export function FilterTags() {
  const { filter, setFilter } = useNpcListContext();

  return (
    <div className="flex flex-wrap gap-2" aria-label="Filtry NPC">
      {FILTER_TAGS.map((tag) => {
        const isActive = filter.value === tag.value;

        return (
          <Button
            key={tag.value}
            type="button"
            variant={isActive ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setFilter(tag)}
            aria-pressed={isActive}
          >
            {tag.label}
          </Button>
        );
      })}
    </div>
  );
}
