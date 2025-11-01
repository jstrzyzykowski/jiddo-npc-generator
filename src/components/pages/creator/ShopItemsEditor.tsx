import { Fragment, useMemo, type ComponentType } from "react";
import { Info, Plus, ShoppingBag, ShoppingCart } from "lucide-react";
import { useFieldArray, type FieldArrayWithId, type UseFormReturn } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import type { CreatorFormData, CreatorShopItemFormData } from "@/lib/validators/npcValidators";

import { ShopItemCard } from "./ShopItemCard";

type ShopListType = CreatorShopItemFormData["list_type"];

interface ShopSectionDefinition {
  listType: ShopListType;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}

const SHOP_SECTIONS: ShopSectionDefinition[] = [
  {
    listType: "buy",
    title: "Items NPC buys",
    description: "Add items the NPC will purchase from players.",
    icon: ShoppingCart,
  },
  {
    listType: "sell",
    title: "Items NPC sells",
    description: "List the items the NPC offers for sale.",
    icon: ShoppingBag,
  },
];

export interface ShopItemsEditorProps {
  form: UseFormReturn<CreatorFormData>;
  disabled?: boolean;
}

export function ShopItemsEditor({ form, disabled }: ShopItemsEditorProps) {
  const { control, formState } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "shop_items",
    keyName: "__internalId",
  });

  const sections = useMemo(() => groupFieldsByType(fields), [fields]);

  const rootError = resolveRootError(formState.errors.shop_items);

  const handleAddItem = (listType: ShopListType) => {
    append(createEmptyShopItem(listType));
  };

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold">NPC shop</h2>
        <p className="text-sm text-muted-foreground">
          Manage the items the NPC can buy and sell. Enable the shop module to allow trading interactions.
        </p>
      </header>

      {SHOP_SECTIONS.map((section) => {
        const entries = sections[section.listType] ?? [];

        return (
          <Fragment key={section.listType}>
            <div className="space-y-4 rounded-lg border border-border bg-card/40 p-5">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 text-left">
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold">{section.title}</h3>
                    <p className="text-sm text-muted-foreground">{section.description}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddItem(section.listType)}
                    disabled={disabled}
                    className="w-full sm:w-auto"
                  >
                    <Plus className="size-4" aria-hidden="true" />
                    Add item
                  </Button>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="rounded-full bg-primary/10 p-2 text-primary">
                      <Info className="size-4" aria-hidden />
                    </span>
                    <p className="text-xs text-muted-foreground">
                      Add items to this group to define the NPC&apos;s trading options.
                    </p>
                  </div>
                </div>
              </div>

              <Separator className="bg-border/60" />

              {entries.length === 0 ? (
                <p className="rounded-md border border-dashed border-muted-foreground/30 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                  No items in this section yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {entries.map(({ id, index }) => (
                    <ShopItemCard
                      key={id}
                      form={form}
                      index={index}
                      disabled={disabled}
                      onRemove={() => remove(index)}
                    />
                  ))}
                </div>
              )}
            </div>
          </Fragment>
        );
      })}

      {rootError ? <p className="text-sm text-destructive">{rootError}</p> : null}

      <p className="text-xs text-muted-foreground">
        The total number of entries is limited by your server configuration. Double-check the values before saving.
      </p>
    </section>
  );
}

function groupFieldsByType(
  fields: FieldArrayWithId<CreatorFormData, "shop_items", "__internalId">[]
): Record<ShopListType, { id: string; index: number }[]> {
  return fields.reduce<Record<ShopListType, { id: string; index: number }[]>>(
    (acc, field, index) => {
      const listType = (field.list_type as ShopListType | undefined) ?? "buy";
      const entryId = field.__internalId ?? `${index}`;

      const bucket = acc[listType] ?? [];
      bucket.push({ id: entryId, index });
      acc[listType] = bucket;
      return acc;
    },
    { buy: [], sell: [] }
  );
}

function createEmptyShopItem(listType: ShopListType): CreatorShopItemFormData {
  return {
    list_type: listType,
    name: "",
    item_id: 0,
    price: 0,
    subtype: undefined,
    charges: undefined,
    real_name: undefined,
    container_item_id: undefined,
  };
}

function resolveRootError(error: unknown): string | null {
  if (!error) {
    return null;
  }

  if (Array.isArray(error)) {
    return null;
  }

  if (
    typeof error === "object" &&
    error &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  if (
    typeof error === "object" &&
    error &&
    "root" in error &&
    typeof (error as { root?: { message?: unknown } }).root?.message === "string"
  ) {
    return (error as { root: { message: string } }).root.message;
  }

  return null;
}
