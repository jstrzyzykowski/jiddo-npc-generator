import { Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { NpcCodeViewModel } from "./types";

export interface NpcCodePreviewProps {
  code: NpcCodeViewModel;
  onCopy: (content: string) => Promise<void> | void;
}

const TABS: { value: "xml" | "lua"; label: string; description: string }[] = [
  { value: "xml", label: "XML", description: "NPC configuration" },
  { value: "lua", label: "Lua", description: "Default behavior script" },
];

export function NpcCodePreview({ code, onCopy }: NpcCodePreviewProps) {
  const copyDisabled = code.isCopyDisabled;

  return (
    <section
      aria-labelledby="npc-code-preview-title"
      className="flex flex-col gap-5 rounded-2xl border border-border/60 bg-card/60 p-6 shadow-sm backdrop-blur"
    >
      <header className="flex flex-col gap-1">
        <h2 id="npc-code-preview-title" className="text-xl font-semibold text-foreground">
          Generated files
        </h2>
        <p className="text-sm text-muted-foreground">Review the XML definition and Lua template used for this NPC.</p>
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
      <ScrollArea className="max-h-[480px]">
        <pre className="font-mono whitespace-pre-wrap break-words p-4 text-xs leading-relaxed text-foreground">
          <code>{content}</code>
        </pre>
      </ScrollArea>
    </div>
  );
}

export default NpcCodePreview;
