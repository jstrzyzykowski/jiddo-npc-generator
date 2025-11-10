import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { Crosshair, Map, MessageSquareText, Mic2, ShoppingBag, User } from "lucide-react";

import outfitPreview from "@/assets/images/Outfit_Martial_Artist_Female_Addon_3.gif";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
  const { name, author, createdAt, updatedAt, modules } = metadata;

  return (
    <section
      aria-labelledby="npc-metadata-title"
      className="relative flex flex-col gap-8 overflow-hidden rounded-2xl p-6 bg-card/60 border border-border/60 shadow-sm backdrop-blur"
    >
      <div className="relative z-10 flex h-full flex-col gap-8">
        <header className="flex flex-col gap-6">
          <div className="relative flex w-full items-center justify-center rounded-2xl p-6">
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
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <User className="size-4" aria-hidden />
              {author}
            </p>
          </div>
        </header>

        <dl className="flex flex-col gap-4 text-sm">
          <MetadataItem label="Created" value={createdAt} />
          <MetadataItem label="Last updated" value={updatedAt} />
        </dl>

        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold tracking-wide text-muted-foreground">Modules</h2>
          {renderModules(modules)}
        </div>
      </div>
    </section>
  );
}

interface MetadataItemProps {
  label: string;
  value: ReactNode;
}

function MetadataItem({ label, value }: MetadataItemProps) {
  const stringValue = typeof value === "string" ? value : null;
  const isUnavailable = stringValue === "Not available" || stringValue === "Not published";

  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-semibold tracking-wide text-muted-foreground">{label}</dt>
      <dd className={cn("text-sm font-medium text-foreground", isUnavailable && "text-muted-foreground")}>{value}</dd>
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
