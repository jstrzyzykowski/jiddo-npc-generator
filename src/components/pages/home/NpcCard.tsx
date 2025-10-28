import { MessageSquareText, ShoppingBag } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { NpcListItemDto } from "@/types";
import outfitPreview from "@/assets/images/Outfit_Martial_Artist_Female_Addon_3.gif";

interface NpcCardProps {
  npc: NpcListItemDto;
}

export function NpcCard({ npc }: NpcCardProps) {
  const ownerName = npc.owner.displayName?.trim() || "Unknown creator";
  const updatedLabel = formatDateLabel(npc.updatedAt);
  const modules = buildModules(npc.modules);

  return (
    <a
      href={`/npcs/${npc.id}`}
      className="group block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Card className="h-full overflow-hidden transition-colors duration-200 group-hover:bg-muted/40">
        <CardHeader className="space-y-4">
          <div
            className="relative flex aspect-[4/3] items-center justify-center rounded-lg border border-muted-foreground/20 dark:bg-zinc-950/50 bg-zinc-950/10"
            style={{
              backgroundImage: "radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)",
              backgroundSize: "17px 17px",
            }}
          >
            <img
              src={outfitPreview.src}
              alt="Preview of featured NPC"
              loading="lazy"
              width={96}
              height={96}
              className="h-28 w-28 object-contain"
            />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-xl font-semibold text-foreground transition-colors group-hover:text-primary">
              {npc.name}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">by {ownerName}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
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
        <CardFooter className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Updated {updatedLabel}</span>
          <span>{formatSize(npc.contentSizeBytes)}</span>
        </CardFooter>
      </Card>
    </a>
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
