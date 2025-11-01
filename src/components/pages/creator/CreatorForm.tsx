import { useMemo } from "react";
import { useWatch, type UseFormReturn } from "react-hook-form";

import { Form } from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";

import type { CreatorFormData } from "@/lib/validators/npcValidators";

import type { CreatorGenerationState } from "@/hooks/useNpcCreator";

import { CreatorActionToolbar } from "./CreatorActionToolbar";
import { KeywordsEditor } from "./KeywordsEditor";
import { NpcParametersFormSection } from "./NpcParametersFormSection";
import { ShopItemsEditor } from "./ShopItemsEditor";

export interface CreatorFormProps {
  form: UseFormReturn<CreatorFormData>;
  mode: "create" | "edit";
  generationState: CreatorGenerationState;
  isBusy?: boolean;
  onSaveDraft: (data: CreatorFormData) => Promise<void> | void;
  onSaveChanges: (data: CreatorFormData) => Promise<void> | void;
  onGenerate: (data: CreatorFormData) => Promise<void> | void;
}

export function CreatorForm({
  form,
  mode,
  generationState,
  isBusy = false,
  onSaveDraft,
  onSaveChanges,
  onGenerate,
}: CreatorFormProps) {
  const isSubmitting = form.formState.isSubmitting;
  const isGenerationBusy = generationState.status === "queued" || generationState.status === "processing";
  const isShopActive = useWatch({ control: form.control, name: "is_shop_active" }) ?? false;
  const isKeywordsActive = useWatch({ control: form.control, name: "is_keywords_active" }) ?? false;

  const isDisabled = isBusy || isSubmitting || isGenerationBusy;

  const handleSaveDraft = useMemo(
    () =>
      form.handleSubmit(async (values) => {
        await onSaveDraft(values);
      }),
    [form, onSaveDraft]
  );

  const handleSaveChanges = useMemo(
    () =>
      form.handleSubmit(async (values) => {
        await onSaveChanges(values);
      }),
    [form, onSaveChanges]
  );

  const handleGenerate = useMemo(
    () =>
      form.handleSubmit(async (values) => {
        await onGenerate(values);
      }),
    [form, onGenerate]
  );

  return (
    <Form {...form}>
      <form className="flex h-full min-h-0 flex-col" noValidate>
        <ScrollArea className="flex-1 h-full min-h-0 pr-2">
          <div className="space-y-8 pb-8 pr-2">
            <NpcParametersFormSection form={form} disabled={isDisabled} />

            {isShopActive ? <ShopItemsEditor form={form} disabled={isDisabled} /> : null}

            {isKeywordsActive ? <KeywordsEditor form={form} disabled={isDisabled} /> : null}
          </div>
        </ScrollArea>

        <CreatorActionToolbar
          mode={mode}
          formState={form.formState}
          generationState={generationState}
          onSaveDraft={mode === "create" ? handleSaveDraft : undefined}
          onSaveChanges={mode === "edit" ? handleSaveChanges : undefined}
          onGenerate={mode === "edit" ? handleGenerate : undefined}
          disabled={isDisabled}
        />
      </form>
    </Form>
  );
}
