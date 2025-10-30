import type { LucideIcon } from "lucide-react";

import { Eye, EyeOff } from "lucide-react";

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";

interface NpcStatusIndicatorProps {
  status: "draft" | "published";
  publishedAt: string | null;
  className?: string;
}

const STATUS_CONFIG: Record<
  NpcStatusIndicatorProps["status"],
  {
    label: string;
    icon: LucideIcon;
    className: string;
  }
> = {
  draft: {
    label: "Draft",
    icon: EyeOff,
    className: "text-secondary-foreground/60",
  },
  published: {
    label: "Published",
    icon: Eye,
    className: "text-secondary-foreground/60",
  },
};

export function NpcStatusIndicator({ status, publishedAt, className }: NpcStatusIndicatorProps) {
  const config = STATUS_CONFIG[status];
  const StatusIcon = config.icon;

  return (
    <HoverCard openDelay={0} closeDelay={0}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex size-10 items-center justify-center rounded-full bg-background/80 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            config.className,
            className
          )}
          aria-label={`Status: ${config.label}`}
        >
          <StatusIcon className="size-5" aria-hidden />
        </button>
      </HoverCardTrigger>
      <HoverCardContent side="top" className="w-64 space-y-2">
        <div>
          <p className="text-sm font-semibold text-foreground">{config.label}</p>
          <p className="text-xs text-muted-foreground">
            {status === "published"
              ? publishedAt
                ? `Published on ${publishedAt}`
                : "Published date unavailable."
              : "This NPC has not been published yet."}
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export default NpcStatusIndicator;
