import { Info, Plus, Trash2, Type } from "lucide-react";
import { useWatch, type UseFormReturn } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import type { CreatorFormData } from "@/lib/validators/npcValidators";

export interface KeywordCardProps {
  form: UseFormReturn<CreatorFormData>;
  index: number;
  onRemove: () => void;
  disabled?: boolean;
}

export function KeywordCard({ form, index, onRemove, disabled }: KeywordCardProps) {
  const { control, setValue } = form;

  const phrases = useWatch({ control, name: `keywords.${index}.phrases` }) ?? [];

  const title = useWatch({ control, name: `keywords.${index}.response_text` }) ?? "Keyword";

  const handleAddPhrase = () => {
    setValue(`keywords.${index}.phrases`, [...phrases, ""], {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const handleRemovePhrase = (phraseIndex: number) => {
    const updatedPhrases = phrases.filter((_, idx) => idx !== phraseIndex);

    setValue(`keywords.${index}.phrases`, updatedPhrases, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  return (
    <Card className="border-muted">
      <CardHeader className="flex flex-col space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-primary/10 p-2 text-primary">
              <Type className="size-4" aria-hidden="true" />
            </span>
            <CardTitle className="text-base font-semibold">
              {title ? truncate(title, 48) : `Keyword #${index + 1}`}
            </CardTitle>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            disabled={disabled}
            aria-label={`Remove keyword ${index + 1}`}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        </div>

        <FormField
          control={control}
          name={`keywords.${index}.response_text`}
          render={({ field }) => (
            <FormItem className="w-full">
              <FormLabel className="flex items-center gap-2">
                <span>NPC response</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-muted-foreground transition-colors hover:text-foreground">
                      <Info className="size-4" aria-hidden="true" />
                      <span className="sr-only">Learn more about NPC response</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" align="start">
                    Text the NPC will send when the keyword is matched.
                  </TooltipContent>
                </Tooltip>
              </FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Enter the text the NPC should say when this keyword matches"
                  rows={3}
                  disabled={disabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">Trigger phrases</h4>
          <Button type="button" variant="outline" size="sm" onClick={handleAddPhrase} disabled={disabled}>
            <Plus className="mr-2 size-4" aria-hidden="true" /> Add phrase
          </Button>
        </div>

        {phrases.length === 0 ? (
          <p className="rounded-md border border-dashed border-muted-foreground/30 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            No trigger phrases yet. Add at least one to activate this keyword.
          </p>
        ) : (
          <div className="space-y-3">
            {phrases.map((_, phraseIndex) => (
              <FormField
                key={`${index}-${phraseIndex}`}
                control={control}
                name={`keywords.${index}.phrases.${phraseIndex}`}
                render={({ field: phraseField }) => (
                  <FormItem>
                    <FormLabel className="sr-only">Phrase {phraseIndex + 1}</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input
                          {...phraseField}
                          placeholder={`Phrase ${phraseIndex + 1}`}
                          disabled={disabled}
                          value={phraseField.value ?? ""}
                          onChange={(event) => phraseField.onChange(event.target.value)}
                        />
                      </FormControl>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemovePhrase(phraseIndex)}
                        disabled={disabled}
                        aria-label={`Remove phrase ${phraseIndex + 1}`}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trim()}…`;
}
