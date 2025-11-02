import { createRootPage, type AppShellProps } from "@/components/AppShell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useCallback, useMemo } from "react";
import sampleNpcXml from "@/assets/mocks/sample-npc.xml?raw";

import { CreatorForm } from "./CreatorForm";
import { GenerationStatusPoller } from "./GenerationStatusPoller";

import { useNpcCreator } from "@/hooks/useNpcCreator";
import { NpcCodePreview } from "@/components/features/npc/detail/NpcCodePreview";

export interface CreatorAppProps extends AppShellProps {
  npcId?: string;
}

const COPY_SIZE_LIMIT_BYTES = 262_144; // 256 KB

function CreatorApp({ npcId }: CreatorAppProps) {
  const {
    form,
    mode,
    code,
    generationState,
    isLoading,
    error,
    shouldPollGeneration,
    handleSaveDraft,
    handleSaveChanges,
    handleGenerate,
    handleGenerationPollingSuccess,
    handleGenerationPollingError,
    reload,
  } = useNpcCreator(npcId);

  const previewModel = useMemo(
    () => ({
      xml: code.xml ?? "",
      lua: code.lua ?? "",
      isCopyDisabled: (code.contentSizeBytes ?? 0) > COPY_SIZE_LIMIT_BYTES,
    }),
    [code]
  );

  const isXmlPlaceholder = useMemo(() => {
    return mode === "edit" && (code.xml ?? "") === (sampleNpcXml ?? "");
  }, [mode, code.xml]);

  const isGenerationBusy = generationState.status === "queued" || generationState.status === "processing";

  const handleCopy = useCallback(async (content: string) => {
    if (!content) {
      toast.error("No content to copy.");
      return;
    }

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(content);
      } else if (typeof document !== "undefined") {
        const textarea = document.createElement("textarea");
        textarea.value = content;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      } else {
        throw new Error("Clipboard API is not available.");
      }

      toast.success("Copied to clipboard.");
    } catch (copyError) {
      console.error("CreatorApp.copy", copyError);
      toast.error("Failed to copy content.");
    }
  }, []);

  const formattedUpdatedAt = useMemo(() => {
    if (!code.lastUpdatedAt) {
      return null;
    }

    try {
      const date = new Date(code.lastUpdatedAt);
      if (Number.isNaN(date.getTime())) {
        return null;
      }

      return new Intl.DateTimeFormat("pl-PL", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
    } catch (formatError) {
      console.error("CreatorApp.formatUpdatedAt", formatError);
      return null;
    }
  }, [code.lastUpdatedAt]);

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-4 py-8">
      {!isLoading ? (
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" className="self-start" asChild>
            <a href="/" className="inline-flex items-center gap-2">
              <ArrowLeft className="size-4" aria-hidden />
              Exit Creator
            </a>
          </Button>

          {mode === "edit" && npcId ? (
            <Button type="button" variant="outline" size="sm" onClick={() => reload()} disabled={isLoading}>
              <RefreshCw className="mr-2 size-4" aria-hidden="true" /> Refresh data
            </Button>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <Alert variant="destructive" className="max-w-3xl">
          <AlertTitle>Could not load NPC data.</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <span>{error}</span>
            <div>
              <Button type="button" onClick={() => reload()} size="sm">
                <RefreshCw className="mr-2 size-4" aria-hidden="true" /> Try again
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : isLoading ? (
        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
          <Spinner className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {mode === "edit" ? "Loading NPC data..." : "Preparing the NPC creator..."}
          </p>
        </div>
      ) : (
        <div className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <aside>
            <div className="flex h-full max-h-[calc(100vh-18rem)] flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/40 p-6 shadow-sm">
              <CreatorForm
                form={form}
                mode={mode}
                generationState={generationState}
                isBusy={isLoading}
                onSaveDraft={handleSaveDraft}
                onSaveChanges={handleSaveChanges}
                onGenerate={handleGenerate}
              />
            </div>
          </aside>

          <main className="relative">
            {mode === "edit" && isXmlPlaceholder ? (
              <Alert variant="default" className="mb-4">
                <AlertTitle>XML not generated yet</AlertTitle>
                <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm">
                    You haven’t generated XML for this NPC. Save any changes and generate XML to proceed.
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    disabled={isLoading || isGenerationBusy}
                    onClick={async () => {
                      const values = form.getValues();
                      if (form.formState.isDirty) {
                        await handleSaveChanges(values);
                      }
                      await handleGenerate(values);
                    }}
                  >
                    Generate XML
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}
            <NpcCodePreview
              code={previewModel}
              onCopy={handleCopy}
              isLoading={code.isLoading}
              status={generationState.status}
              statusMessage={generationState.error}
              updatedAt={formattedUpdatedAt}
            />
          </main>
        </div>
      )}

      {shouldPollGeneration && npcId && generationState.jobId ? (
        <GenerationStatusPoller
          npcId={npcId}
          jobId={generationState.jobId}
          onSuccess={handleGenerationPollingSuccess}
          onError={handleGenerationPollingError}
        />
      ) : null}
    </div>
  );
}

export const CreatorPage = createRootPage<CreatorAppProps>(CreatorApp);

export default CreatorApp;
