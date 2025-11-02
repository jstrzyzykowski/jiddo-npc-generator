import { Info, Trash2 } from "lucide-react";
import { useWatch, type UseFormReturn } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import type { CreatorFormData, CreatorShopItemFormData } from "@/lib/validators/npcValidators";

const LIST_TYPE_LABEL: Record<CreatorShopItemFormData["list_type"], string> = {
  buy: "Player sells to NPC",
  sell: "NPC sells to player",
};

export interface ShopItemCardProps {
  form: UseFormReturn<CreatorFormData>;
  index: number;
  onRemove: () => void;
  disabled?: boolean;
}

export function ShopItemCard({ form, index, onRemove, disabled }: ShopItemCardProps) {
  const { control } = form;
  const listType = useWatch({ control, name: `shop_items.${index}.list_type` }) ?? "buy";
  const title = LIST_TYPE_LABEL[listType as keyof typeof LIST_TYPE_LABEL] ?? "Item";

  return (
    <Card className="border-none ">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <CardTitle className="flex flex-col gap-1 text-base">
          <span>Item {index + 1}</span>
          <Badge variant="secondary" className="w-max text-xs font-normal tracking-wide">
            {title}
          </Badge>
        </CardTitle>

        <div className="flex items-center gap-2">
          <FormField
            control={control}
            name={`shop_items.${index}.list_type`}
            render={({ field }) => <input type="hidden" {...field} value={field.value ?? listType} />}
          />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            disabled={disabled}
            aria-label={`Remove item ${index + 1}`}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="grid gap-4">
        <FormField
          control={control}
          name={`shop_items.${index}.name`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Item name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Name" disabled={disabled} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={`shop_items.${index}.item_id`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <span>Item ID</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-muted-foreground transition-colors hover:text-foreground">
                      <Info className="size-4" aria-hidden="true" />
                      <span className="sr-only">Learn more about item ID</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Provide the numeric item identifier used by the server.</TooltipContent>
                </Tooltip>
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  inputMode="numeric"
                  placeholder="100"
                  disabled={disabled}
                  value={field.value ?? ""}
                  onChange={(event) => field.onChange(event.target.value)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={`shop_items.${index}.price`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <span>{listType === "buy" ? "Buy price" : "Sell price"}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-muted-foreground transition-colors hover:text-foreground">
                      <Info className="size-4" aria-hidden="true" />
                      <span className="sr-only">Learn more about pricing</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Use whole numbers representing the cost in gold coins.</TooltipContent>
                </Tooltip>
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  inputMode="numeric"
                  placeholder="50"
                  disabled={disabled}
                  value={field.value ?? ""}
                  onChange={(event) => field.onChange(event.target.value)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={`shop_items.${index}.subtype`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <span>Subtype (optional)</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-muted-foreground transition-colors hover:text-foreground">
                      <Info className="size-4" aria-hidden="true" />
                      <span className="sr-only">Learn more about subtype</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Set a subtype or action ID for stackable or special items.</TooltipContent>
                </Tooltip>
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  inputMode="numeric"
                  placeholder="0"
                  disabled={disabled}
                  value={field.value ?? ""}
                  onChange={(event) => field.onChange(event.target.value)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={`shop_items.${index}.charges`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <span>Charges (optional)</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-muted-foreground transition-colors hover:text-foreground">
                      <Info className="size-4" aria-hidden="true" />
                      <span className="sr-only">Learn more about charges</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Specify the number of charges or uses for the item.</TooltipContent>
                </Tooltip>
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  inputMode="numeric"
                  placeholder="0"
                  disabled={disabled}
                  value={field.value ?? ""}
                  onChange={(event) => field.onChange(event.target.value)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={`shop_items.${index}.real_name`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <span>Alternative name (optional)</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-muted-foreground transition-colors hover:text-foreground">
                      <Info className="size-4" aria-hidden="true" />
                      <span className="sr-only">Learn more about alternative name</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Provide a display name shown to players instead of the default.
                  </TooltipContent>
                </Tooltip>
              </FormLabel>
              <FormControl>
                <Input {...field} placeholder="Display name" disabled={disabled} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={`shop_items.${index}.container_item_id`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <span>Container item ID (optional)</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-muted-foreground transition-colors hover:text-foreground">
                      <Info className="size-4" aria-hidden="true" />
                      <span className="sr-only">Learn more about container ID</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Define the container item that holds this entry when sold as a bundle.
                  </TooltipContent>
                </Tooltip>
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  inputMode="numeric"
                  placeholder="Container ID"
                  disabled={disabled}
                  value={field.value ?? ""}
                  onChange={(event) => field.onChange(event.target.value)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
