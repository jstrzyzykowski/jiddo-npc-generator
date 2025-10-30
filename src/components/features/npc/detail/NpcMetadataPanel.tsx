import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { Crosshair, Map, MessageSquareText, Mic2, ShoppingBag } from "lucide-react";

import outfitPreview from "@/assets/images/Outfit_Martial_Artist_Female_Addon_3.gif";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import type { NpcMetadataViewModel } from "./types";

const MODULE_ICONS: Record<string, LucideIcon> = {
  focus: Crosshair,
  travel: Map,
  voice: Mic2,
  Shop: ShoppingBag,
  Keywords: MessageSquareText,
  shop: ShoppingBag,
  keywords: MessageSquareText,
};

export interface NpcMetadataPanelProps {
  metadata: NpcMetadataViewModel;
}

export function NpcMetadataPanel({ metadata }: NpcMetadataPanelProps) {
  const { name, author, createdAt, updatedAt, publishedAt, modules } = metadata;

  return (
    <section
      aria-labelledby="npc-metadata-title"
      className="relative flex flex-col gap-8 rounded-2xl border border-border/60 bg-card/60 p-6 shadow-sm backdrop-blur"
    >
      <header className="flex flex-col gap-6">
        <div className="relative flex w-full items-center justify-center rounded-2xl bg-gradient-to-br from-muted/60 via-background to-muted/30 p-6 shadow-inner lg:p-10">
          <img
            src={outfitPreview.src}
            alt="NPC outfit preview"
            width={144}
            height={144}
            className="h-28 w-28 object-contain drop-shadow-lg lg:h-32 lg:w-32"
            loading="lazy"
          />
        </div>

        <div className="flex w-full flex-col items-center gap-2 text-center lg:items-start lg:text-left">
          <h1 id="npc-metadata-title" className="text-xl font-semibold text-foreground sm:text-2xl">
            {name}
          </h1>
          <p className="text-sm text-muted-foreground">Created by {author}</p>
        </div>
      </header>

      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        <MetadataItem label="Created" value={createdAt} tooltip={createdAt} />
        <MetadataItem label="Last updated" value={updatedAt} tooltip={updatedAt} />
        <MetadataItem label="Published" value={publishedAt ?? "Not published"} tooltip={publishedAt ?? undefined} />
      </dl>

      <div className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold tracking-wide text-muted-foreground">Modules</h2>
        {renderModules(modules)}
      </div>
    </section>
  );
}

interface MetadataItemProps {
  label: string;
  value: ReactNode;
  tooltip?: string;
}

function MetadataItem({ label, value, tooltip }: MetadataItemProps) {
  const stringValue = typeof value === "string" ? value : null;
  const isUnavailable = stringValue === "Not available" || stringValue === "Not published";

  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-semibold tracking-wide text-muted-foreground">{label}</dt>
      <dd
        className={cn("text-sm font-medium text-foreground", isUnavailable && "text-muted-foreground")}
        data-tooltip={tooltip && !isUnavailable ? "true" : undefined}
      >
        {tooltip && !isUnavailable ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {value}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">{tooltip}</TooltipContent>
          </Tooltip>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

function renderModules(modules: NpcMetadataViewModel["modules"]) {
  if (modules.length === 0) {
    return <p className="text-sm text-muted-foreground">No module information available.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {modules.map((module) => {
        const Icon = MODULE_ICONS[module.id] ?? MODULE_ICONS[module.label] ?? ShoppingBag;
        const isActive = module.isActive;

        return (
          <Badge
            key={module.id}
            variant={isActive ? "secondary" : "outline"}
            className={cn("gap-2 px-3 py-1 text-xs transition-colors", !isActive && "text-muted-foreground opacity-60")}
          >
            <Icon
              className={cn("size-4", isActive ? "text-secondary-foreground" : "text-muted-foreground")}
              aria-hidden
            />
            {module.label}
          </Badge>
        );
      })}
    </div>
  );
}

export default NpcMetadataPanel;
