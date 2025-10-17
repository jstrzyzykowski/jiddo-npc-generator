import { z } from "zod";

import type { CreateNpcCommand } from "../../types";

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

const npcLookSchema = z
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
  .strict()
  .superRefine((value, ctx) => {
    if (value.type === "player" || value.type === "monster") {
      if (value.typeId === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["typeId"],
          message: "typeId is required for player and monster looks.",
        });
      }

      const equipmentFields: [keyof typeof value, number | null][] = [
        ["head", value.head],
        ["body", value.body],
        ["legs", value.legs],
        ["feet", value.feet],
        ["addons", value.addons],
      ];

      for (const [field, fieldValue] of equipmentFields) {
        if (fieldValue === null) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [field],
            message: `${field} must be provided for player looks.`,
          });
        }
      }
    } else {
      if (value.typeId !== null && value.typeId <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["typeId"],
          message: "typeId must be positive when provided.",
        });
      }

      const equipmentFields: [keyof typeof value, number | null][] = [
        ["head", value.head],
        ["body", value.body],
        ["legs", value.legs],
        ["feet", value.feet],
        ["addons", value.addons],
      ];

      for (const [field, fieldValue] of equipmentFields) {
        if (fieldValue !== null) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [field],
            message: `${field} must be null for non-player looks.`,
          });
        }
      }
    }

    if (value.type === "item") {
      if (value.itemId === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["itemId"],
          message: "itemId is required for item looks.",
        });
      }
    } else if (value.itemId !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["itemId"],
        message: "itemId must be null unless the look type is item.",
      });
    }
  });

const npcStatsSchema = z
  .object({
    healthNow: z.number().int().min(HEALTH_MIN).max(HEALTH_MAX),
    healthMax: z.number().int().min(1).max(HEALTH_MAX),
    walkInterval: z.number().int().min(WALK_INTERVAL_MIN).max(WALK_INTERVAL_MAX),
    floorChange: z.boolean(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.healthMax < value.healthNow) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["healthMax"],
        message: "healthMax must be greater than or equal to healthNow.",
      });
    }
  });

const npcMessagesSchema = z
  .object({
    greet: z.string().trim().min(1).max(NPC_MESSAGE_MAX_LENGTH),
    farewell: z.string().trim().min(1).max(NPC_MESSAGE_MAX_LENGTH),
    decline: z.string().trim().min(1).max(NPC_MESSAGE_MAX_LENGTH),
    noShop: z.string().trim().min(1).max(NPC_MESSAGE_MAX_LENGTH),
    onCloseShop: z.string().trim().min(1).max(NPC_MESSAGE_MAX_LENGTH),
  })
  .strict();

const npcModulesSchema = z
  .object({
    focusEnabled: z.boolean(),
    travelEnabled: z.boolean(),
    voiceEnabled: z.boolean(),
    shopEnabled: z.boolean(),
    shopMode: z.enum(["trade_window", "talk_mode"]),
    keywordsEnabled: z.boolean(),
  })
  .strict();

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
