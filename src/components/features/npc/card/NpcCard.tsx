import { CircleHelp, MessageSquareText, MoreHorizontal, ShoppingBag, type LucideIcon } from "lucide-react";
import type { MouseEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import type { NpcListItemDto } from "@/types";
import outfitPreview from "@/assets/images/Outfit_Martial_Artist_Female_Addon_3.gif";

interface NpcCardProps {
  npc: NpcListItemDto;
  showPreview?: boolean;
  showActions?: boolean;
  showInfoHover?: boolean;
  onOpenActions?: (npc: NpcListItemDto) => void;
}

export function NpcCard({
  npc,
  showPreview = true,
  showActions = true,
  showInfoHover = true,
  onOpenActions,
}: NpcCardProps) {
  const ownerName = npc.owner.displayName?.trim() || "Unknown creator";
  const updatedLabel = formatDateLabel(npc.updatedAt);
  const publishedLabel = formatDateLabel(npc.publishedAt ?? npc.updatedAt);
  const modules = buildModules(npc.modules);
  const contentSize = formatSize(npc.contentSizeBytes);

  const handleActionClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onOpenActions?.(npc);
  };

  return (
    <Card className="relative flex h-full flex-col overflow-hidden transition-colors duration-200 group-hover:bg-muted/40">
      {showActions ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleActionClick}
          className="absolute right-6 top-3 z-10 inline-flex size-8 items-center justify-center rounded-full bg-background/80 text-muted-foreground shadow transition-colors hover:text-primary"
          aria-label="Akcje NPC"
        >
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </Button>
      ) : null}

      <a
        href={`/npcs/${npc.id}`}
        className="group flex h-full flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {showPreview ? (
          <div
            className="relative flex aspect-[4/3] items-center justify-center border-b border-border/60 bg-zinc-950/10 dark:bg-zinc-950/40"
            style={{
              backgroundImage: "radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)",
              backgroundSize: "18px 18px",
            }}
          >
            <img
              src={outfitPreview.src}
              alt="Preview of featured NPC"
              loading="lazy"
              width={112}
              height={112}
              className="h-28 w-28 object-contain"
            />
          </div>
        ) : null}

        <CardHeader>
          <CardTitle className="flex items-start justify-between gap-3 text-lg text-foreground transition-colors group-hover:text-primary">
            {npc.name}
          </CardTitle>
        </CardHeader>

        <CardContent className="flex flex-wrap gap-2">
          {modules.length > 0 ? (
            modules.map((module) => (
              <Badge
                key={module.label}
                variant="secondary"
                className="flex items-center gap-1 rounded-full px-3 py-1 text-[11px] uppercase"
              >
                <module.icon className="size-3.5" aria-hidden />
                {module.label}
              </Badge>
            ))
          ) : (
            <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] uppercase text-muted-foreground">
              No modules enabled
            </Badge>
          )}
        </CardContent>

        <CardFooter className="mt-auto flex items-center justify-end px-6 pt-0 text-xs text-muted-foreground">
          {/* <div className="flex flex-col gap-1">
            <span className="font-medium uppercase tracking-wide">Updated {updatedLabel}</span>
            <span className="text-[11px] uppercase tracking-wide">Published {publishedLabel}</span>
          </div> */}

          {showInfoHover ? (
            <HoverCard openDelay={0} closeDelay={0}>
              <HoverCardTrigger asChild>
                <span
                  className="inline-flex size-8 items-center justify-center rounded-full bg-background/80 text-muted-foreground shadow transition-colors hover:text-primary"
                  aria-label="Szczegóły NPC"
                >
                  <CircleHelp className="size-4" aria-hidden="true" />
                </span>
              </HoverCardTrigger>
              <HoverCardContent side="top" className="w-72 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{npc.name}</p>
                  <p className="text-xs text-muted-foreground">Twórca: {ownerName}</p>
                </div>
                <dl className="grid grid-cols-1 gap-2 text-xs">
                  <div className="flex items-center justify-between">
                    <dt className="font-medium text-muted-foreground">Status</dt>
                    <dd className="uppercase text-foreground">{npc.status}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="font-medium text-muted-foreground">Published</dt>
                    <dd className="text-foreground">{publishedLabel}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="font-medium text-muted-foreground">Updated</dt>
                    <dd className="text-foreground">{updatedLabel}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="font-medium text-muted-foreground">Content size</dt>
                    <dd className="text-foreground">{contentSize}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="font-medium text-muted-foreground">Modules</dt>
                    <dd className="flex gap-2 text-foreground">
                      {modules.length > 0
                        ? modules.map((module) => (
                            <span key={module.label} className="inline-flex items-center gap-1">
                              <module.icon className="size-3" aria-hidden />
                              {module.label}
                            </span>
                          ))
                        : "None"}
                    </dd>
                  </div>
                </dl>
              </HoverCardContent>
            </HoverCard>
          ) : (
            <span className="text-[11px] uppercase tracking-wide">{contentSize}</span>
          )}
        </CardFooter>
      </a>
    </Card>
  );
}

interface ModuleDescriptor {
  label: string;
  icon: LucideIcon;
}

function buildModules(modules: NpcListItemDto["modules"]): ModuleDescriptor[] {
  const result: ModuleDescriptor[] = [];

  if (modules.shopEnabled) {
    result.push({ label: "Shop", icon: ShoppingBag });
  }

  if (modules.keywordsEnabled) {
    result.push({ label: "Keywords", icon: MessageSquareText });
  }

  return result;
}

function formatDateLabel(isoDate: string | null): string {
  if (!isoDate) {
    return "n/a";
  }

  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return "recently";
  }

  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatSize(sizeInBytes: number | null): string {
  if (!sizeInBytes || !Number.isFinite(sizeInBytes) || sizeInBytes <= 0) {
    return "size unknown";
  }

  const kilobytes = sizeInBytes / 1024;

  if (kilobytes < 1) {
    return `${sizeInBytes.toFixed(0)} B`;
  }

  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(1)} KB`;
  }

  const megabytes = kilobytes / 1024;
  return `${megabytes.toFixed(1)} MB`;
}
