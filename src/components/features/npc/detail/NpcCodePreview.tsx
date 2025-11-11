import { Copy, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { NpcCodeViewModel } from "./types";

export interface NpcCodePreviewProps {
  code: NpcCodeViewModel;
  onCopy: (content: string) => Promise<void> | void;
  isLoading?: boolean;
  status?: "idle" | "queued" | "processing" | "succeeded" | "failed";
  statusMessage?: string | null;
  updatedAt?: string | null;
}

const TABS: { value: "xml" | "lua"; label: string; description: string }[] = [
  { value: "xml", label: "XML", description: "NPC configuration" },
  { value: "lua", label: "Lua", description: "Default behavior script" },
];

const STATUS_LABELS: Record<Exclude<NpcCodePreviewProps["status"], undefined | "idle">, string> = {
  queued: "Waiting in queue",
  processing: "Generation in progress",
  succeeded: "Generated",
  failed: "Generation error",
};

export function NpcCodePreview({ code, onCopy, isLoading, status, statusMessage, updatedAt }: NpcCodePreviewProps) {
  const copyDisabled = code.isCopyDisabled;
  const effectiveStatus = status && status !== "idle" ? status : null;
  const statusLabel = effectiveStatus ? (STATUS_LABELS[effectiveStatus] ?? null) : null;

  return (
    <section
      aria-labelledby="npc-code-preview-title"
      className="relative flex flex-col gap-5 rounded-2xl border border-border/60 bg-card/60 p-6 shadow-sm backdrop-blur"
      aria-busy={isLoading}
    >
      {isLoading ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-background/80">
          <Loader2 className="size-5 animate-spin text-primary" aria-hidden="true" />
          <span className="text-sm text-muted-foreground">Trwa generowanie plików NPC...</span>
        </div>
      ) : null}

      <header className="flex flex-col gap-1">
        <h2 id="npc-code-preview-title" className="text-xl font-semibold text-foreground">
          Generated Files
        </h2>
        <p className="text-sm text-muted-foreground">Review the XML definition and Lua template used for this NPC.</p>

        {(statusLabel || updatedAt) && (
          <p className="text-xs text-muted-foreground">
            {statusLabel ? <span className="font-medium text-foreground">Status:</span> : null}
            {statusLabel ? <span className="ml-1 text-foreground/80">{statusLabel}</span> : null}
            {updatedAt ? (
              <>
                {statusLabel ? <span className="mx-2 text-muted-foreground/60">•</span> : null}
                <span className="font-medium text-foreground">Last updated:</span>
                <span className="ml-1 text-foreground/80">{updatedAt}</span>
              </>
            ) : null}
          </p>
        )}
        {status === "failed" && statusMessage ? <p className="text-xs text-destructive">{statusMessage}</p> : null}
      </header>

      <Tabs defaultValue="xml" className="flex flex-col gap-4">
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((tab) => {
          const content = tab.value === "xml" ? code.xml : code.lua;

          return (
            <TabsContent key={tab.value} value={tab.value} className="flex flex-col gap-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{tab.label} file</h3>
                  <p className="text-xs text-muted-foreground">{tab.description}</p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="self-start sm:self-auto"
                  onClick={() => onCopy(content)}
                  disabled={copyDisabled}
                  title={copyDisabled ? "Copy is unavailable for files larger than 256 KB." : undefined}
                >
                  <Copy aria-hidden />
                  Copy {tab.label}
                </Button>
              </div>

              <CodeBlock value={content} language={tab.label} />
            </TabsContent>
          );
        })}
      </Tabs>

      {copyDisabled ? (
        <p className="rounded-md border border-dashed border-muted-foreground/30 bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
          Copying is disabled because the generated files exceed 256 KB.
        </p>
      ) : null}
    </section>
  );
}

interface CodeBlockProps {
  value: string;
  language: string;
}

function CodeBlock({ value, language }: CodeBlockProps) {
  const languageLabel = language.toUpperCase();
  const content = value && value.trim().length > 0 ? value : "// No content available";

  return (
    <div className="overflow-hidden rounded-lg border border-border/60 bg-background/90">
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-4 py-2 text-xs uppercase text-muted-foreground">
        <span>{languageLabel}</span>
      </div>
      <ScrollArea className="h-86">
        <pre className="font-mono whitespace-pre-wrap break-words p-4 text-xs leading-relaxed text-foreground">
          <code className="break-all">{content}</code>
        </pre>
      </ScrollArea>
    </div>
  );
}

export default NpcCodePreview;
