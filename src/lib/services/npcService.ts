import type { SupabaseClient } from "../../db/supabase.client";
import type { Database } from "../../db/database.types";
import type { CreateNpcCommand, NpcLookDto, NpcStatsDto, NpcMessagesDto, NpcModulesDto } from "../../types";

type NpcInsert = Database["public"]["Tables"]["npcs"]["Insert"];
type NpcRow = Database["public"]["Tables"]["npcs"]["Row"];

export interface CreateNpcServiceResult {
  npc: Pick<NpcRow, "id" | "status" | "owner_id" | "created_at" | "updated_at">;
  created: boolean;
}

export type NpcServiceErrorCode =
  | "DUPLICATE_REQUEST"
  | "NPC_INSERT_FAILED"
  | "NPC_FETCH_FAILED"
  | "NPC_ACCESS_FORBIDDEN"
  | "UNKNOWN";

export class NpcServiceError extends Error {
  constructor(
    public readonly code: NpcServiceErrorCode,
    options?: { cause?: unknown }
  ) {
    super(`[NpcService] ${code}`, options);
    this.name = "NpcServiceError";
  }
}

export class NpcService {
  constructor(private readonly supabase: SupabaseClient) {}

  async createNpc(command: CreateNpcCommand, ownerId: string): Promise<CreateNpcServiceResult> {
    if (!ownerId) {
      throw new NpcServiceError("NPC_INSERT_FAILED", {
        cause: new Error("Missing owner identifier"),
      });
    }

    const existingNpc = await this.findByClientRequestId(command.clientRequestId, ownerId);
    if (existingNpc) {
      return {
        npc: existingNpc,
        created: false,
      };
    }

    const insertPayload = this.mapToNpcInsert(command, ownerId);

    const { data, error } = await this.supabase
      .from("npcs")
      .insert(insertPayload)
      .select("id, status, owner_id, created_at, updated_at")
      .single();

    if (error) {
      if (isForbiddenSupabaseError(error)) {
        throw new NpcServiceError("NPC_ACCESS_FORBIDDEN", { cause: error });
      }

      if (isDuplicateClientRequestError(error)) {
        throw new NpcServiceError("DUPLICATE_REQUEST", { cause: error });
      }

      console.error("NpcService.createNpc insert", error);
      throw new NpcServiceError("NPC_INSERT_FAILED", { cause: error });
    }

    if (!data) {
      throw new NpcServiceError("NPC_INSERT_FAILED", {
        cause: new Error("Missing data after insert"),
      });
    }

    return {
      npc: data,
      created: true,
    };
  }

  private async findByClientRequestId(
    clientRequestId: string,
    ownerId: string
  ): Promise<CreateNpcServiceResult["npc"] | null> {
    const { data, error } = await this.supabase
      .from("npcs")
      .select("id, status, owner_id, created_at, updated_at")
      .eq("client_request_id", clientRequestId)
      .eq("owner_id", ownerId)
      .maybeSingle();

    if (error) {
      if (isForbiddenSupabaseError(error)) {
        throw new NpcServiceError("NPC_ACCESS_FORBIDDEN", { cause: error });
      }

      console.error("NpcService.findByClientRequestId", error);
      throw new NpcServiceError("NPC_FETCH_FAILED", { cause: error });
    }

    return data ?? null;
  }

  private mapToNpcInsert(command: CreateNpcCommand, ownerId: string): NpcInsert {
    const look = mapLook(command.look);
    const stats = mapStats(command.stats);
    const messages = mapMessages(command.messages);
    const modules = mapModules(command.modules);

    const base: NpcInsert = {
      owner_id: ownerId,
      client_request_id: command.clientRequestId,
      status: "draft",
      system: "jiddo_tfs_1_5",
      implementation_type: "xml",
      name: command.name,
      script: "default.lua",
      ...look,
      ...stats,
      ...messages,
      ...modules,
      content_size_bytes: command.contentSizeBytes,
    };

    return base satisfies NpcInsert;
  }
}

function mapLook(
  look: NpcLookDto
): Pick<
  NpcInsert,
  | "look_type"
  | "look_type_id"
  | "look_item_id"
  | "look_head"
  | "look_body"
  | "look_legs"
  | "look_feet"
  | "look_addons"
  | "look_mount"
> {
  return {
    look_type: look.type,
    look_type_id: look.typeId,
    look_item_id: look.itemId,
    look_head: look.head,
    look_body: look.body,
    look_legs: look.legs,
    look_feet: look.feet,
    look_addons: look.addons,
    look_mount: look.mount,
  } satisfies Pick<
    NpcInsert,
    | "look_type"
    | "look_type_id"
    | "look_item_id"
    | "look_head"
    | "look_body"
    | "look_legs"
    | "look_feet"
    | "look_addons"
    | "look_mount"
  >;
}

function mapStats(stats: NpcStatsDto): Pick<NpcInsert, "health_now" | "health_max" | "walk_interval" | "floor_change"> {
  return {
    health_now: stats.healthNow,
    health_max: stats.healthMax,
    walk_interval: stats.walkInterval,
    floor_change: stats.floorChange,
  } satisfies Pick<NpcInsert, "health_now" | "health_max" | "walk_interval" | "floor_change">;
}

function mapMessages(
  messages: NpcMessagesDto
): Pick<
  NpcInsert,
  "greet_message" | "farewell_message" | "decline_message" | "no_shop_message" | "on_close_shop_message"
> {
  return {
    greet_message: messages.greet,
    farewell_message: messages.farewell,
    decline_message: messages.decline,
    no_shop_message: messages.noShop,
    on_close_shop_message: messages.onCloseShop,
  } satisfies Pick<
    NpcInsert,
    "greet_message" | "farewell_message" | "decline_message" | "no_shop_message" | "on_close_shop_message"
  >;
}

function mapModules(
  modules: NpcModulesDto
): Pick<
  NpcInsert,
  "focus_enabled" | "travel_enabled" | "voice_enabled" | "shop_enabled" | "shop_mode" | "keywords_enabled"
> {
  return {
    focus_enabled: modules.focusEnabled,
    travel_enabled: modules.travelEnabled,
    voice_enabled: modules.voiceEnabled,
    shop_enabled: modules.shopEnabled,
    shop_mode: modules.shopMode,
    keywords_enabled: modules.keywordsEnabled,
  } satisfies Pick<
    NpcInsert,
    "focus_enabled" | "travel_enabled" | "voice_enabled" | "shop_enabled" | "shop_mode" | "keywords_enabled"
  >;
}

function isForbiddenSupabaseError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { status?: number; code?: string; message?: string };

  if (candidate.status === 403) {
    return true;
  }

  if (typeof candidate.code === "string" && ["PGRST116", "PGRST301"].includes(candidate.code)) {
    return true;
  }

  if (typeof candidate.message === "string" && candidate.message.toLowerCase().includes("permission denied")) {
    return true;
  }

  return false;
}

function isDuplicateClientRequestError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { code?: string; details?: string; message?: string };

  if (typeof candidate.code === "string" && ["23505", "PGRST116"].includes(candidate.code)) {
    return true;
  }

  if (typeof candidate.details === "string" && candidate.details.includes("client_request_id")) {
    return true;
  }

  if (typeof candidate.message === "string" && candidate.message.toLowerCase().includes("duplicate")) {
    return true;
  }

  return false;
}
