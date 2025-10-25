import { z } from "zod";

import type {
  BulkReplaceNpcKeywordsCommand,
  BulkReplaceNpcShopItemsCommand,
  CreateNpcCommand,
  CreateNpcShopItemCommand,
  DeleteNpcQueryDto,
  GetFeaturedNpcsQueryDto,
  GetNpcListQueryDto,
  NpcKeywordCreationData,
  TriggerNpcGenerationCommand,
  TriggerNpcGenerationQueryDto,
  UpdateNpcCommand,
} from "../../types";
const CURSOR_MAX_LENGTH = 1024;
const SEARCH_MAX_LENGTH = 255;
const LIMIT_DEFAULT = 20;
const LIMIT_MAX = 100;
const FEATURED_LIMIT_MIN = 1;
const FEATURED_LIMIT_MAX = 10;
const FEATURED_LIMIT_DEFAULT = 10;
const XML_MAX_LENGTH = 131_072;
const SHOP_ITEM_NAME_MAX_LENGTH = 255;
const SHOP_ITEM_REAL_NAME_MAX_LENGTH = 255;
const SHOP_ITEMS_LIMIT_MAX = 255;
const KEYWORD_RESPONSE_MAX_LENGTH = 512;
const KEYWORD_PHRASE_MAX_LENGTH = 64;
const KEYWORD_LIMIT_MAX = 255;

const npcKeywordPhraseSchema = z
  .string()
  .trim()
  .min(1, { message: "Phrase cannot be empty." })
  .max(KEYWORD_PHRASE_MAX_LENGTH, {
    message: `Phrase must be at most ${KEYWORD_PHRASE_MAX_LENGTH} characters long.`,
  });

const npcKeywordCreationSchema: z.ZodType<NpcKeywordCreationData> = z
  .object({
    response: z
      .string()
      .trim()
      .min(1, { message: "Response cannot be empty." })
      .max(KEYWORD_RESPONSE_MAX_LENGTH, {
        message: `Response must be at most ${KEYWORD_RESPONSE_MAX_LENGTH} characters long.`,
      }),
    sortIndex: z
      .number({ required_error: "sortIndex is required." })
      .int({ message: "sortIndex must be an integer." })
      .min(0, { message: "sortIndex must be a non-negative integer." }),
    phrases: z
      .array(npcKeywordPhraseSchema, {
        required_error: "phrases is required.",
        invalid_type_error: "phrases must be an array of strings.",
      })
      .min(1, { message: "phrases must contain at least one phrase." }),
  })
  .strict();

const bulkReplaceNpcKeywordsCommandSchema: z.ZodType<BulkReplaceNpcKeywordsCommand> = z
  .object({
    items: z
      .array(npcKeywordCreationSchema, {
        required_error: "items is required.",
        invalid_type_error: "items must be an array of keyword definitions.",
      })
      .max(KEYWORD_LIMIT_MAX, {
        message: `items must contain at most ${KEYWORD_LIMIT_MAX} entries.`,
      }),
  })
  .strict();

export type BulkReplaceNpcKeywordsCommandInput = z.input<typeof bulkReplaceNpcKeywordsCommandSchema>;
export type BulkReplaceNpcKeywordsCommandResult = z.output<typeof bulkReplaceNpcKeywordsCommandSchema>;

export function parseBulkReplaceNpcKeywordsCommand(payload: unknown): BulkReplaceNpcKeywordsCommand {
  return bulkReplaceNpcKeywordsCommandSchema.parse(payload);
}

type CreateNpcShopItemCommandInput = Omit<
  CreateNpcShopItemCommand,
  "subtype" | "charges" | "realName" | "containerItemId"
> & {
  subtype?: number;
  charges?: number;
  realName?: string | null;
  containerItemId?: number | null;
};

const booleanQueryParam = z
  .preprocess((value) => {
    if (typeof value === "string") {
      if (value === "true") {
        return true;
      }

      if (value === "false") {
        return false;
      }
    }

    return value;
  }, z.boolean())
  .optional();

const limitQueryParam = z
  .preprocess((value) => {
    if (value === undefined) {
      return undefined;
    }

    if (typeof value === "number") {
      return value;
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed === "") {
        return value;
      }

      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed)) {
        return value;
      }

      return parsed;
    }

    return value;
  }, z.number().int().min(1).max(LIMIT_MAX))
  .optional();

const featuredLimitQueryParam = z
  .preprocess((value) => {
    if (value === undefined) {
      return undefined;
    }

    if (typeof value === "number") {
      return value;
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed === "") {
        return value;
      }

      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed)) {
        return value;
      }

      return parsed;
    }

    return value;
  }, z.number().int().min(FEATURED_LIMIT_MIN).max(FEATURED_LIMIT_MAX))
  .optional();

const getFeaturedNpcsQuerySchema = z
  .object({
    limit: featuredLimitQueryParam,
  })
  .strict();

export type GetFeaturedNpcsQueryInput = z.input<typeof getFeaturedNpcsQuerySchema>;
export type GetFeaturedNpcsQueryResult = z.output<typeof getFeaturedNpcsQuerySchema>;

export function parseGetFeaturedNpcsQueryParams(params: URLSearchParams): GetFeaturedNpcsQueryDto {
  const rawEntries = Object.fromEntries(params.entries());
  const result = getFeaturedNpcsQuerySchema.safeParse(rawEntries);

  if (!result.success) {
    throw result.error;
  }

  const parsed = result.data;

  const normalized: GetFeaturedNpcsQueryDto = {
    limit: parsed.limit ?? FEATURED_LIMIT_DEFAULT,
  };

  return normalized;
}

const getNpcListQuerySchema = z
  .object({
    visibility: z.enum(["public", "mine", "all"]).optional(),
    status: z.enum(["draft", "published"]).optional(),
    search: z
      .preprocess((value) => {
        if (typeof value === "string") {
          return value.trim();
        }

        return value;
      }, z.string().min(1).max(SEARCH_MAX_LENGTH))
      .optional(),
    shopEnabled: booleanQueryParam,
    keywordsEnabled: booleanQueryParam,
    limit: limitQueryParam,
    cursor: z.string().min(1).max(CURSOR_MAX_LENGTH).optional(),
    sort: z.enum(["published_at", "updated_at", "created_at"]).optional(),
    order: z.enum(["asc", "desc"]).optional(),
  })
  .strict();

export type GetNpcListQueryInput = z.input<typeof getNpcListQuerySchema>;
export type GetNpcListQueryResult = z.output<typeof getNpcListQuerySchema>;

export function parseGetNpcListQueryParams(params: URLSearchParams): GetNpcListQueryDto {
  const rawEntries = Object.fromEntries(params.entries());
  const result = getNpcListQuerySchema.safeParse(rawEntries);

  if (!result.success) {
    throw result.error;
  }

  const parsed = result.data;

  const normalized: GetNpcListQueryDto = {
    visibility: parsed.visibility,
    status: parsed.status,
    search: parsed.search,
    shopEnabled: parsed.shopEnabled,
    keywordsEnabled: parsed.keywordsEnabled,
    limit: parsed.limit ?? LIMIT_DEFAULT,
    cursor: parsed.cursor,
    sort: parsed.sort ?? "published_at",
    order: parsed.order ?? "desc",
  };

  return normalized;
}

const NPC_NAME_MAX_LENGTH = 255;
const NPC_MESSAGE_MAX_LENGTH = 512;
const LOOK_COLOR_MIN = 0;
const LOOK_COLOR_MAX = 132;
const LOOK_ADDONS_MIN = 0;
const LOOK_ADDONS_MAX = 3;
const HEALTH_MIN = 0;
const HEALTH_MAX = 65535;
const WALK_INTERVAL_MIN = 0;
const WALK_INTERVAL_MAX = 65535;
const CONTENT_SIZE_MIN = 0;
const CONTENT_SIZE_MAX = 262_144;

const npcLookBaseSchema = z
  .object({
    type: z.enum(["player", "monster", "item"]),
    typeId: z.number().int().positive().nullable(),
    itemId: z.number().int().positive().nullable(),
    head: z.number().int().min(LOOK_COLOR_MIN).max(LOOK_COLOR_MAX).nullable(),
    body: z.number().int().min(LOOK_COLOR_MIN).max(LOOK_COLOR_MAX).nullable(),
    legs: z.number().int().min(LOOK_COLOR_MIN).max(LOOK_COLOR_MAX).nullable(),
    feet: z.number().int().min(LOOK_COLOR_MIN).max(LOOK_COLOR_MAX).nullable(),
    addons: z.number().int().min(LOOK_ADDONS_MIN).max(LOOK_ADDONS_MAX).nullable(),
    mount: z.number().int().min(0).nullable(),
  })
  .strict();

const equipmentFieldNames = ["head", "body", "legs", "feet", "addons"] as const;

function hasDefinedProperties(record: Record<string, unknown> | null | undefined): boolean {
  if (!record) {
    return false;
  }

  return Object.values(record).some((value) => value !== undefined);
}

function validateNpcLook(
  value: Partial<z.infer<typeof npcLookBaseSchema>>,
  ctx: z.RefinementCtx,
  { partial }: { partial: boolean }
): void {
  const type = value.type;

  const otherLookValues = [
    value.typeId,
    value.itemId,
    value.mount,
    ...equipmentFieldNames.map((field) => value[field]),
  ];

  if (partial && type === undefined) {
    const hasOtherFields = otherLookValues.some((field) => field !== undefined);

    if (hasOtherFields) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["type"],
        message: "type is required when updating look properties.",
      });
    }

    return;
  }

  if (!type) {
    return;
  }

  if (type === "player" || type === "monster") {
    if (value.typeId === null || value.typeId === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["typeId"],
        message: "typeId is required for player and monster looks.",
      });
    }

    for (const fieldName of equipmentFieldNames) {
      const fieldValue = value[fieldName];
      if (!partial && fieldValue === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [fieldName],
          message: `${fieldName} must be provided for player looks.`,
        });
      }

      if (partial && fieldValue === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [fieldName],
          message: `${fieldName} cannot be null for player looks.`,
        });
      }

      if (!partial && fieldValue === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [fieldName],
          message: `${fieldName} must be provided for player looks.`,
        });
      }
    }
  } else {
    if (value.typeId !== null && value.typeId !== undefined && value.typeId <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["typeId"],
        message: "typeId must be positive when provided.",
      });
    }

    for (const fieldName of equipmentFieldNames) {
      const fieldValue = value[fieldName];
      if (fieldValue !== null && fieldValue !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [fieldName],
          message: `${fieldName} must be null for non-player looks.`,
        });
      }
    }
  }

  if (type === "item") {
    if (value.itemId === null || value.itemId === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["itemId"],
        message: "itemId is required for item looks.",
      });
    }
  } else if (value.itemId !== null && value.itemId !== undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["itemId"],
      message: "itemId must be null unless the look type is item.",
    });
  }
}

const npcLookSchema = npcLookBaseSchema.superRefine((value, ctx) => {
  validateNpcLook(value, ctx, { partial: false });
});

const updateNpcLookSchema = npcLookBaseSchema.partial().superRefine((value, ctx) => {
  if (!hasDefinedProperties(value)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one look field must be provided when updating look.",
      path: [],
    });
    return;
  }

  validateNpcLook(value, ctx, { partial: true });
});

const npcStatsBaseSchema = z
  .object({
    healthNow: z.number().int().min(HEALTH_MIN).max(HEALTH_MAX),
    healthMax: z.number().int().min(1).max(HEALTH_MAX),
    walkInterval: z.number().int().min(WALK_INTERVAL_MIN).max(WALK_INTERVAL_MAX),
    floorChange: z.boolean(),
  })
  .strict();

const npcStatsSchema = npcStatsBaseSchema.superRefine((value, ctx) => {
  if (value.healthMax < value.healthNow) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["healthMax"],
      message: "healthMax must be greater than or equal to healthNow.",
    });
  }
});

const updateNpcStatsSchema = npcStatsBaseSchema.partial().superRefine((value, ctx) => {
  if (!hasDefinedProperties(value)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one stats field must be provided when updating stats.",
      path: [],
    });
    return;
  }

  const healthNow = value.healthNow;
  const healthMax = value.healthMax;

  if (typeof healthNow === "number" && typeof healthMax === "number" && healthMax < healthNow) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["healthMax"],
      message: "healthMax must be greater than or equal to healthNow.",
    });
  }
});

const npcMessagesBaseSchema = z
  .object({
    greet: z.string().trim().min(1).max(NPC_MESSAGE_MAX_LENGTH),
    farewell: z.string().trim().min(1).max(NPC_MESSAGE_MAX_LENGTH),
    decline: z.string().trim().min(1).max(NPC_MESSAGE_MAX_LENGTH),
    noShop: z.string().trim().min(1).max(NPC_MESSAGE_MAX_LENGTH),
    onCloseShop: z.string().trim().min(1).max(NPC_MESSAGE_MAX_LENGTH),
  })
  .strict();

const npcMessagesSchema = npcMessagesBaseSchema;
const updateNpcMessagesSchema = npcMessagesBaseSchema.partial().superRefine((value, ctx) => {
  if (!hasDefinedProperties(value)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one message field must be provided when updating messages.",
      path: [],
    });
  }
});

const npcModulesBaseSchema = z
  .object({
    focusEnabled: z.boolean(),
    travelEnabled: z.boolean(),
    voiceEnabled: z.boolean(),
    shopEnabled: z.boolean(),
    shopMode: z.enum(["trade_window", "talk_mode"]),
    keywordsEnabled: z.boolean(),
  })
  .strict();

const npcModulesSchema = npcModulesBaseSchema;
const updateNpcModulesSchema = npcModulesBaseSchema.partial().superRefine((value, ctx) => {
  if (!hasDefinedProperties(value)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one module field must be provided when updating modules.",
      path: [],
    });
  }
});

export const createNpcCommandSchema: z.ZodType<CreateNpcCommand> = z
  .object({
    clientRequestId: z.string().uuid(),
    name: z.string().trim().min(1).max(NPC_NAME_MAX_LENGTH),
    look: npcLookSchema,
    stats: npcStatsSchema,
    messages: npcMessagesSchema,
    modules: npcModulesSchema,
    contentSizeBytes: z.number().int().min(CONTENT_SIZE_MIN).max(CONTENT_SIZE_MAX),
  })
  .strict();

export type CreateNpcCommandInput = z.input<typeof createNpcCommandSchema>;
export type CreateNpcCommandResult = z.infer<typeof createNpcCommandSchema>;

export function parseCreateNpcCommand(payload: unknown): CreateNpcCommand {
  return createNpcCommandSchema.parse(payload);
}

type _CreateNpcCommandTypeCheck = [CreateNpcCommandResult] extends [CreateNpcCommand]
  ? [CreateNpcCommand] extends [CreateNpcCommandResult]
    ? true
    : never
  : never;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _EnsureCreateNpcCommandMatches = _CreateNpcCommandTypeCheck;

const updateNpcCommandSchema: z.ZodType<UpdateNpcCommand> = z
  .object({
    clientRequestId: z.string().uuid().optional(),
    name: z.string().trim().min(1).max(NPC_NAME_MAX_LENGTH).optional(),
    look: updateNpcLookSchema.optional(),
    stats: updateNpcStatsSchema.optional(),
    messages: updateNpcMessagesSchema.optional(),
    modules: updateNpcModulesSchema.optional(),
    contentSizeBytes: z.number().int().min(CONTENT_SIZE_MIN).max(CONTENT_SIZE_MAX).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided for update.",
  })
  .superRefine((value, ctx) => {
    const stats = value.stats;
    if (!stats) {
      return;
    }

    const healthNow = stats.healthNow;
    const healthMax = stats.healthMax;

    if (typeof healthNow === "number" && typeof healthMax === "number" && healthMax < healthNow) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["stats", "healthMax"],
        message: "healthMax must be greater than or equal to healthNow.",
      });
    }
  });

export type UpdateNpcCommandInput = z.input<typeof updateNpcCommandSchema>;
export type UpdateNpcCommandResult = z.infer<typeof updateNpcCommandSchema>;

export function parseUpdateNpcCommand(payload: unknown): UpdateNpcCommand {
  return updateNpcCommandSchema.parse(payload);
}

type _UpdateNpcCommandTypeCheck = [UpdateNpcCommandResult] extends [UpdateNpcCommand]
  ? [UpdateNpcCommand] extends [UpdateNpcCommandResult]
    ? true
    : never
  : never;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _EnsureUpdateNpcCommandMatches = _UpdateNpcCommandTypeCheck;

export const deleteNpcValidator = z
  .object({
    npcId: z.string().uuid(),
    reason: z
      .preprocess((value) => {
        if (typeof value !== "string") {
          return value;
        }

        const trimmed = value.trim();
        return trimmed.length === 0 ? undefined : trimmed;
      }, z.string().max(255))
      .optional(),
  })
  .strict();

export type DeleteNpcValidatorInput = z.input<typeof deleteNpcValidator>;
export type DeleteNpcValidatorResult = z.output<typeof deleteNpcValidator>;

export function validateDeleteNpcParams(payload: unknown): DeleteNpcQueryDto & { npcId: string } {
  const result = deleteNpcValidator.parse(payload);

  const normalizedReason =
    typeof result.reason === "string" && result.reason.trim().length > 0 ? result.reason : undefined;

  return {
    npcId: result.npcId,
    reason: normalizedReason,
  } satisfies DeleteNpcQueryDto & { npcId: string };
}

const triggerNpcGenerationQuerySchema = z
  .object({
    force: booleanQueryParam.transform((value) => value ?? false),
  })
  .strict();

export type TriggerNpcGenerationQueryInput = z.input<typeof triggerNpcGenerationQuerySchema>;
export type TriggerNpcGenerationQueryResult = z.output<typeof triggerNpcGenerationQuerySchema>;

export function parseTriggerNpcGenerationQuery(params: URLSearchParams): TriggerNpcGenerationQueryDto {
  const rawEntries = Object.fromEntries(params.entries());
  const result = triggerNpcGenerationQuerySchema.safeParse(rawEntries);

  if (!result.success) {
    throw result.error;
  }

  return {
    force: result.data.force,
  } satisfies TriggerNpcGenerationQueryDto;
}

const triggerNpcGenerationCommandSchema: z.ZodType<TriggerNpcGenerationCommand> = z
  .object({
    regenerate: z.boolean(),
    currentXml: z
      .string()
      .trim()
      .max(XML_MAX_LENGTH)
      .nullable()
      .transform((value) => (value === "" ? null : value)),
  })
  .strict();

export type TriggerNpcGenerationCommandInput = z.input<typeof triggerNpcGenerationCommandSchema>;
export type TriggerNpcGenerationCommandResult = z.infer<typeof triggerNpcGenerationCommandSchema>;

export function parseTriggerNpcGenerationCommand(payload: unknown): TriggerNpcGenerationCommand {
  return triggerNpcGenerationCommandSchema.parse(payload);
}

const createNpcShopItemCommandSchema: z.ZodType<CreateNpcShopItemCommand, z.ZodTypeDef, CreateNpcShopItemCommandInput> =
  z
    .object({
      listType: z.enum(["buy", "sell"]),
      name: z.string().trim().min(1).max(SHOP_ITEM_NAME_MAX_LENGTH),
      itemId: z.number().int().positive(),
      price: z.number().int().min(0),
      subtype: z.number().int().min(0).optional(),
      charges: z.number().int().min(0).optional(),
      realName: z.string().trim().max(SHOP_ITEM_REAL_NAME_MAX_LENGTH).optional().nullable(),
      containerItemId: z.number().int().positive().optional().nullable(),
    })
    .strict()
    .transform((item) => {
      const normalizedRealName = typeof item.realName === "string" ? item.realName.trim() : null;

      return {
        listType: item.listType,
        name: item.name,
        itemId: item.itemId,
        price: item.price,
        subtype: item.subtype ?? 0,
        charges: item.charges ?? 0,
        realName: normalizedRealName && normalizedRealName.length > 0 ? normalizedRealName : null,
        containerItemId: item.containerItemId ?? null,
      } satisfies CreateNpcShopItemCommand;
    });

const bulkReplaceNpcShopItemsCommandSchema: z.ZodType<
  BulkReplaceNpcShopItemsCommand,
  z.ZodTypeDef,
  { items: CreateNpcShopItemCommandInput[] }
> = z
  .object({
    items: z.array(createNpcShopItemCommandSchema).max(SHOP_ITEMS_LIMIT_MAX),
  })
  .strict()
  .transform((value) => ({ items: value.items }) satisfies BulkReplaceNpcShopItemsCommand);

export type BulkReplaceNpcShopItemsCommandInput = z.input<typeof bulkReplaceNpcShopItemsCommandSchema>;
export type BulkReplaceNpcShopItemsCommandResult = z.infer<typeof bulkReplaceNpcShopItemsCommandSchema>;

export function parseBulkReplaceNpcShopItemsCommand(payload: unknown): BulkReplaceNpcShopItemsCommand {
  return bulkReplaceNpcShopItemsCommandSchema.parse(payload);
}
