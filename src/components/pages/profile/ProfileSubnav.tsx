import { Badge } from "@/components/ui/badge";

interface ProfileSubnavProps {
  active: "npcs" | "overview";
  totalCount: number;
  onChange: (key: "npcs" | "overview") => void;
}

export function ProfileSubnav({ active, totalCount, onChange }: ProfileSubnavProps) {
  return (
    <div className="sticky top-[65px] z-20 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-12 w-full max-w-[1200px] items-center gap-2 px-4">
        <button
          type="button"
          className={
            active === "npcs"
              ? "inline-flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-sm font-medium"
              : "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          }
          onClick={() => onChange("npcs")}
          aria-current={active === "npcs" ? "page" : undefined}
        >
          NPCs
          <Badge className="rounded-md bg-primary text-primary-foreground border-border/60 text-[11px]">
            {Math.max(0, totalCount)}
          </Badge>
        </button>
      </div>
    </div>
  );
}
