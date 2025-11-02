import { CircleHelp, MessageSquareText, ShoppingBag, Save } from "lucide-react";
import { useCallback } from "react";

import { NpcOwnerActions } from "@/components/features/npc/actions/NpcOwnerActions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { NpcListItemDto } from "@/types";
import outfitPreview from "@/assets/images/Outfit_Martial_Artist_Female_Addon_3.gif";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/components/auth/useAuth";
import { toast } from "sonner";

interface NpcCardProps {
  npc: NpcListItemDto;
  className?: string;
  onRefresh?: () => Promise<void> | void;
}

export function NpcCard({ npc, className, onRefresh }: NpcCardProps) {
  const { user } = useAuth();
  const isOwner = user?.id === npc.owner.id;

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) {
      return;
    }

    try {
      await onRefresh();
    } catch (error) {
      console.error("NpcCard handleRefresh", error);
    }
  }, [onRefresh]);

  const ownerName = npc.owner.displayName?.trim() || "Unknown creator";
  const updatedLabel = formatDateLabel(npc.updatedAt);
  const modules = buildModules(npc.modules);

  const handlePublish = async () => {
    if (npc.status === "published") {
      return;
    }

    try {
      const response = await fetch(`/api/npcs/${npc.id}/publish`, {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const message = errorBody?.error?.message ?? "Failed to publish the NPC.";
        throw new Error(message);
      }

      toast.success("NPC has been published.");
      await handleRefresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to publish the NPC.";
      toast.error(message);
    }
  };

  return (
    <Card
      className={cn(
        "relative flex h-full min-h-[392px] flex-col overflow-hidden border border-border/60 bg-muted/40 transition-colors duration-200 hover:bg-muted/30",
        className
      )}
    >
      <NpcOwnerActions
        npc={{ id: npc.id, name: npc.name, status: npc.status }}
        isOwner={isOwner}
        triggerClassName="absolute right-3 top-3 z-20"
        onEdit={() => {
          window.location.href = `/creator/${npc.id}`;
        }}
        onPublish={handlePublish}
        onDeleteSuccess={handleRefresh}
      />

      <a
        href={`/npcs/${npc.id}`}
        className="group relative flex h-full flex-1 flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <div
          className="relative flex flex-col items-center justify-between gap-6 px-6 py-8 text-center"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        >
          <img
            src={outfitPreview.src}
            alt="Preview of featured NPC"
            loading="lazy"
            width={132}
            height={132}
            className="h-32 w-32 object-contain drop-shadow-lg"
          />
          <CardHeader className="w-full gap-1 p-0">
            <CardTitle className="text-xl font-semibold text-foreground transition-colors group-hover:text-primary">
              {npc.name}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{ownerName}</p>
          </CardHeader>
        </div>

        <CardContent className="flex flex-wrap gap-2 px-6 pb-4 pt-0">
          {modules.length > 0 ? (
            modules.map((module) => (
              <Badge key={module.label} variant="secondary" className="flex items-center gap-1 text-xs">
                <module.icon className="size-3.5" aria-hidden />
                {module.label}
              </Badge>
            ))
          ) : (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              No modules enabled
            </Badge>
          )}
        </CardContent>

        <CardFooter className="mt-auto flex items-center justify-between px-6 pt-0 text-xs text-muted-foreground">
          <div className="flex flex-col gap-1">
            <span>Updated {updatedLabel}</span>
            <span className="inline-flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex text-muted-foreground" aria-label="XML size">
                    <Save className="size-3.5" aria-hidden />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">XML size</TooltipContent>
              </Tooltip>
              {formatSize(npc.contentSizeBytes)}
            </span>
          </div>

          <HoverCard openDelay={0} closeDelay={0}>
            <HoverCardTrigger asChild>
              <span
                className="inline-flex size-8 items-center justify-center rounded-full bg-background/80 text-muted-foreground shadow transition-colors hover:text-primary"
                aria-label="NPC details"
              >
                <CircleHelp className="size-4" aria-hidden="true" />
              </span>
            </HoverCardTrigger>
            <HoverCardContent side="top" className="w-72 space-y-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{npc.name}</p>
                <p className="text-xs text-muted-foreground">{ownerName}</p>
              </div>
              <dl className="grid grid-cols-1 gap-2 text-xs">
                <div className="flex items-center justify-between">
                  <dt className="font-medium text-muted-foreground">Status</dt>
                  <dd className="text-foreground capitalize">{npc.status}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="font-medium text-muted-foreground">Published</dt>
                  <dd className="text-foreground">{formatDateLabel(npc.publishedAt ?? npc.updatedAt)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="font-medium text-muted-foreground">Updated</dt>
                  <dd className="text-foreground">{updatedLabel}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="font-medium text-muted-foreground">Content size</dt>
                  <dd className="text-foreground">{formatSize(npc.contentSizeBytes)}</dd>
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
        </CardFooter>
      </a>
    </Card>
  );
}

interface ModuleDescriptor {
  label: string;
  icon: typeof ShoppingBag;
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

function formatDateLabel(isoDate: string): string {
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

function formatSize(sizeInBytes: number): string {
  if (!Number.isFinite(sizeInBytes) || sizeInBytes <= 0) {
    return "Not Generated";
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
