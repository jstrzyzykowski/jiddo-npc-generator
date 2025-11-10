import { ArrowLeft } from "lucide-react";

import { NpcOwnerActions } from "@/components/features/npc/actions/NpcOwnerActions";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useNpcDetail } from "@/hooks/useNpcDetail";

import { NpcCodePreview } from "./NpcCodePreview";
import { NpcMetadataPanel } from "./NpcMetadataPanel";
import { NpcStatusIndicator } from "./NpcStatusIndicator";

export interface NpcDetailViewProps {
  npcId: string;
}

export default function NpcDetailView({ npcId }: NpcDetailViewProps) {
  const { npc, isLoading, error, publishNpc, handleDeleteSuccess, copyToClipboard, refresh } = useNpcDetail(npcId);

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-center gap-4 px-4 py-24 text-center">
        <Spinner className="size-8" />
        <p className="text-sm text-muted-foreground">Loading NPC details...</p>
      </div>
    );
  }

  if (error) {
    const message = getDisplayErrorMessage(error);

    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16">
        <div className="flex flex-col gap-6 rounded-2xl border border-border/60 bg-card/60 p-8 text-center shadow-sm">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold text-foreground">Unable to load NPC</h1>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button variant="default" onClick={refresh}>
              Try again
            </Button>
            <Button variant="outline" asChild>
              <a href="/npcs">Back to directory</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!npc) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border/60 bg-card/60 p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-foreground">NPC not available</h1>
          <p className="text-sm text-muted-foreground">The requested NPC could not be found.</p>
          <Button variant="outline" asChild>
            <a href="/npcs">Back to directory</a>
          </Button>
        </div>
      </div>
    );
  }

  const { metadata, code, ownerActions, isOwner } = npc;

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-10">
      <div>
        <Button variant="ghost" size="sm" className="self-start" asChild>
          <a href="/npcs" className="inline-flex items-center gap-2">
            <ArrowLeft className="size-4" aria-hidden />
            Back to directory
          </a>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="relative lg:order-2">
          <NpcStatusIndicator
            status={metadata.status}
            publishedAt={metadata.publishedAt}
            className="absolute left-6 top-6 z-20"
          />
          <NpcMetadataPanel metadata={metadata} />
          <NpcOwnerActions
            npc={ownerActions}
            isOwner={isOwner}
            triggerClassName="absolute right-6 top-6 z-10"
            onEdit={() => redirectToEditor(ownerActions.id)}
            onPublish={publishNpc}
            onDeleteSuccess={handleDeleteSuccess}
          />
        </div>
        <div className="lg:order-1">
          <NpcCodePreview code={code} onCopy={copyToClipboard} />
        </div>
      </div>
    </div>
  );
}

function getDisplayErrorMessage(error: Error): string {
  const message = error.message ?? "Failed to load NPC details.";
  const normalized = message.toLowerCase();

  if (normalized.includes("not found")) {
    return "The requested NPC could not be found.";
  }

  if (normalized.includes("forbidden")) {
    return "You do not have permission to view this NPC.";
  }

  return message;
}

function redirectToEditor(npcId: string) {
  if (typeof window !== "undefined") {
    window.location.href = `/creator/${npcId}`;
  }
}
