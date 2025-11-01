import { RefreshCw, Save, Sparkles } from "lucide-react";
import type { ComponentType } from "react";
import type { FormState } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

import type { CreatorFormData } from "@/lib/validators/npcValidators";

import type { CreatorGenerationState } from "@/hooks/useNpcCreator";

export interface CreatorActionToolbarProps {
  mode: "create" | "edit";
  formState: Pick<FormState<CreatorFormData>, "isDirty" | "isValid" | "isSubmitting">;
  generationState: CreatorGenerationState;
  onSaveDraft?: () => void;
  onSaveChanges?: () => void;
  onGenerate?: () => void;
  disabled?: boolean;
}

export function CreatorActionToolbar({
  mode,
  formState,
  generationState,
  onSaveDraft,
  onSaveChanges,
  onGenerate,
  disabled,
}: CreatorActionToolbarProps) {
  const { isDirty, isValid, isSubmitting } = formState;
  const isGenerationBusy = generationState.status === "queued" || generationState.status === "processing";
  const isAnyActionDisabled = disabled || isSubmitting || isGenerationBusy;

  const showSaveDraft = mode === "create" && typeof onSaveDraft === "function";
  const showSaveChanges = mode === "edit" && isDirty && typeof onSaveChanges === "function";
  const showGenerate = mode === "edit" && !isDirty && typeof onGenerate === "function";

  const canSubmit = !isAnyActionDisabled && isValid;
  const canGenerate = showGenerate && !isAnyActionDisabled && isValid;
  const generateLabel = generationState.status === "succeeded" ? "Regenerate XML" : "Generate XML";
  const generateIcon = generationState.status === "succeeded" ? RefreshCw : Sparkles;

  return (
    <footer className="sticky bottom-0 left-0 right-0 z-10 border-t border-border/60 pt-4 backdrop-blur">
      <div className="mx-auto flex w-full flex-col gap-3 px-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          {showSaveDraft ? (
            <Button type="button" onClick={onSaveDraft} disabled={!canSubmit} className="w-full sm:w-auto">
              {isSubmitting ? <ActionSpinner label="Saving" /> : <ActionContent icon={Save} label="Save draft" />}
            </Button>
          ) : null}

          {showSaveChanges ? (
            <Button
              type="button"
              onClick={onSaveChanges}
              disabled={!canSubmit}
              className="w-full sm:w-auto"
              variant="default"
            >
              {isSubmitting ? <ActionSpinner label="Saving" /> : <ActionContent icon={Save} label="Save changes" />}
            </Button>
          ) : null}

          {showGenerate ? (
            <Button
              type="button"
              onClick={onGenerate}
              disabled={!canGenerate}
              variant="secondary"
              className="w-full sm:w-auto"
            >
              {isGenerationBusy ? (
                <ActionSpinner label="Generating" />
              ) : (
                <ActionContent icon={generateIcon} label={generateLabel} />
              )}
            </Button>
          ) : null}
        </div>

        {generationState.status === "failed" && generationState.error ? (
          <p className="text-center text-sm text-destructive">{generationState.error}</p>
        ) : null}

        {isGenerationBusy ? (
          <p className="text-center text-xs text-muted-foreground">
            XML generation is in progress. You can continue editing, but new actions will be available once it
            completes.
          </p>
        ) : null}
      </div>
    </footer>
  );
}

function ActionContent({
  icon: Icon,
  label,
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
}) {
  return (
    <span className="flex items-center justify-center gap-2">
      <Icon className="size-4" aria-hidden />
      {label}
    </span>
  );
}

function ActionSpinner({ label }: { label: string }) {
  return (
    <span className="flex items-center justify-center gap-2">
      <Spinner className="size-4" />
      {label}...
    </span>
  );
}
