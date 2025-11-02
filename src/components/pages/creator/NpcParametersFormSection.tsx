import { Info } from "lucide-react";
import { type UseFormReturn } from "react-hook-form";

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import type { CreatorFormData } from "@/lib/validators/npcValidators";

const LOOK_FIELD_CONFIG: {
  name: keyof Pick<
    CreatorFormData,
    "look_type" | "look_head" | "look_body" | "look_legs" | "look_feet" | "look_addons"
  >;
  label: string;
  hint: string;
  placeholder: string;
}[] = [
  {
    name: "look_type",
    label: "Look type",
    hint: "Numeric ID of the outfit or NPC appearance.",
    placeholder: "128",
  },
  {
    name: "look_head",
    label: "Head color",
    hint: "Enter a value between 0 and 132 representing the head color.",
    placeholder: "0",
  },
  {
    name: "look_body",
    label: "Torso color",
    hint: "Enter a value between 0 and 132 representing the torso color.",
    placeholder: "0",
  },
  {
    name: "look_legs",
    label: "Leg color",
    hint: "Enter a value between 0 and 132 representing the leg color.",
    placeholder: "0",
  },
  {
    name: "look_feet",
    label: "Feet color",
    hint: "Enter a value between 0 and 132 representing the feet color.",
    placeholder: "0",
  },
  {
    name: "look_addons",
    label: "Addons",
    hint: "Value from 0 to 3 defining outfit addon flags.",
    placeholder: "0",
  },
];

export interface NpcParametersFormSectionProps {
  form: UseFormReturn<CreatorFormData>;
  disabled?: boolean;
}

export function NpcParametersFormSection({ form, disabled }: NpcParametersFormSectionProps) {
  const { control } = form;

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold">Basic parameters</h2>
        <p className="text-sm text-muted-foreground">
          The NPC name and appearance are used when generating the XML file.
        </p>
      </header>

      <FormField
        control={control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>NPC name</FormLabel>
            <FormControl>
              <Input {...field} placeholder="NPC name" disabled={disabled} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid gap-4">
        {LOOK_FIELD_CONFIG.map((config) => (
          <FormField
            key={config.name}
            control={control}
            name={config.name}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <span>{config.label}</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-muted-foreground transition-colors hover:text-foreground">
                        <Info className="size-4" aria-hidden="true" />
                        <span className="sr-only">More information about {config.label.toLowerCase()}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">{config.hint}</TooltipContent>
                  </Tooltip>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    inputMode="numeric"
                    placeholder={config.placeholder}
                    disabled={disabled}
                    value={field.value ?? ""}
                    onChange={(event) => field.onChange(event.target.value)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold">NPC modules</h3>
          <p className="text-sm text-muted-foreground">
            Enable additional modules to give the NPC a shop interface or keyword-driven responses.
          </p>
        </div>

        <div className="space-y-3">
          <FormField
            control={control}
            name="is_shop_active"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-md border border-border bg-card/40 p-4">
                <div className="space-y-1">
                  <FormLabel className="flex items-center gap-2">
                    <span>Shop module</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-muted-foreground transition-colors hover:text-foreground">
                          <Info className="size-4" aria-hidden="true" />
                          <span className="sr-only">Learn more about the shop module</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        Allow the NPC to buy and sell items. Requires configuring the item assortment.
                      </TooltipContent>
                    </Tooltip>
                  </FormLabel>
                </div>
                <FormControl>
                  <Switch
                    checked={Boolean(field.value)}
                    onCheckedChange={(checked) => field.onChange(checked)}
                    disabled={disabled}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="is_keywords_active"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-md border border-border bg-card/40 p-4">
                <div className="space-y-1">
                  <FormLabel className="flex items-center gap-2">
                    <span>Keyword module</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-muted-foreground transition-colors hover:text-foreground">
                          <Info className="size-4" aria-hidden="true" />
                          <span className="sr-only">Learn more about the keyword module</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        Let the NPC respond to custom player phrases using prepared answers.
                      </TooltipContent>
                    </Tooltip>
                  </FormLabel>
                </div>
                <FormControl>
                  <Switch
                    checked={Boolean(field.value)}
                    onCheckedChange={(checked) => field.onChange(checked)}
                    disabled={disabled}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      </div>
    </section>
  );
}
