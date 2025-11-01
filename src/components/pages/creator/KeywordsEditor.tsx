import { MessageSquarePlus } from "lucide-react";
import { useFieldArray, type UseFormReturn } from "react-hook-form";

import { Button } from "@/components/ui/button";

import type { CreatorFormData, CreatorKeywordFormData } from "@/lib/validators/npcValidators";

import { KeywordCard } from "./KeywordCard";

export interface KeywordsEditorProps {
  form: UseFormReturn<CreatorFormData>;
  disabled?: boolean;
}

export function KeywordsEditor({ form, disabled }: KeywordsEditorProps) {
  const { control, formState } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "keywords",
    keyName: "__keywordId",
  });

  const rootError = resolveRootError(formState.errors.keywords);

  const handleAddKeyword = () => {
    append(createEmptyKeyword());
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold">Keyword responses</h2>
          <p className="text-sm text-muted-foreground">
            Add keywords and trigger phrases so the NPC can respond to specific player messages.
          </p>
        </div>

        <Button type="button" variant="secondary" size="sm" onClick={handleAddKeyword} disabled={disabled}>
          <MessageSquarePlus className="size-4" aria-hidden="true" /> Add keyword
        </Button>
      </header>

      {fields.length === 0 ? (
        <p className="rounded-md border border-dashed border-muted-foreground/30 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          No keywords yet. Add at least one entry to activate the module.
        </p>
      ) : (
        <div className="space-y-4">
          {fields.map((field, index) => (
            <KeywordCard
              key={field.__keywordId ?? `${index}`}
              form={form}
              index={index}
              disabled={disabled}
              onRemove={() => remove(index)}
            />
          ))}
        </div>
      )}

      {rootError ? <p className="text-sm text-destructive">{rootError}</p> : null}

      <p className="text-xs text-muted-foreground">
        Each keyword must have at least one trigger phrase. You can add or remove phrases at any time.
      </p>
    </section>
  );
}

function createEmptyKeyword(): CreatorKeywordFormData {
  return {
    response_text: "",
    phrases: [""],
  };
}

function resolveRootError(error: unknown): string | null {
  if (!error) {
    return null;
  }

  if (Array.isArray(error)) {
    return null;
  }

  if (typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }

    const rootMessage = (error as { root?: { message?: unknown } }).root?.message;
    if (typeof rootMessage === "string" && rootMessage.trim().length > 0) {
      return rootMessage;
    }
  }

  return null;
}
