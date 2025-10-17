import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { SupabaseClient } from "../../db/supabase.client";
import type { Database } from "../../db/database.types";
import type {
  CreateNpcCommand,
  NpcDetailResponseDto,
  NpcLookDto,
  NpcMessagesDto,
  NpcModulesDto,
  NpcStatsDto,
} from "../../types";

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
  | "NPC_NOT_FOUND"
  | "XML_FETCH_FAILED"
  | "XML_NOT_FOUND"
  | "LUA_READ_FAILED"
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

const DEFAULT_XML_BUCKET = "npc-xml-files";
const DEFAULT_LUA_FILE_PATH = resolve("src", "assets", "lua", "default.lua");

export class NpcService {
  private storageClient: SupabaseClient | null = null;

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

  async getNpcDetails(
    npcId: string,
    userId: string | null,
    options: {
      includeDraft?: boolean;
      storageBucket?: string;
      luaFilePath?: string;
    } = {}
  ): Promise<NpcDetailResponseDto> {
    const includeDraft = options.includeDraft ?? false;
    const storageBucket = options.storageBucket ?? DEFAULT_XML_BUCKET;
    const luaFilePath = options.luaFilePath ?? DEFAULT_LUA_FILE_PATH;

    if (includeDraft && !userId) {
      throw new NpcServiceError("NPC_ACCESS_FORBIDDEN", {
        cause: new Error("Draft access requires an authenticated user"),
      });
    }

    const npcWithOwner = await this.fetchNpcWithOwner(npcId, includeDraft, userId);

    const xmlContent = await this.fetchNpcXml(npcId, storageBucket);

    const luaContent = await this.readLuaTemplate(luaFilePath);

    return {
      id: npcWithOwner.id,
      name: npcWithOwner.name,
      status: npcWithOwner.status,
      system: npcWithOwner.system,
      implementationType: npcWithOwner.implementation_type,
      script: npcWithOwner.script,
      look: {
        type: npcWithOwner.look_type,
        typeId: npcWithOwner.look_type_id,
        itemId: npcWithOwner.look_item_id,
        head: npcWithOwner.look_head,
        body: npcWithOwner.look_body,
        legs: npcWithOwner.look_legs,
        feet: npcWithOwner.look_feet,
        addons: npcWithOwner.look_addons,
        mount: npcWithOwner.look_mount,
      },
      stats: {
        healthNow: npcWithOwner.health_now,
        healthMax: npcWithOwner.health_max,
        walkInterval: npcWithOwner.walk_interval,
        floorChange: npcWithOwner.floor_change,
      },
      messages: {
        greet: npcWithOwner.greet_message,
        farewell: npcWithOwner.farewell_message,
        decline: npcWithOwner.decline_message,
        noShop: npcWithOwner.no_shop_message,
        onCloseShop: npcWithOwner.on_close_shop_message,
      },
      modules: {
        focusEnabled: npcWithOwner.focus_enabled,
        travelEnabled: npcWithOwner.travel_enabled,
        voiceEnabled: npcWithOwner.voice_enabled,
        shopEnabled: npcWithOwner.shop_enabled,
        shopMode: npcWithOwner.shop_mode,
        keywordsEnabled: npcWithOwner.keywords_enabled,
      },
      xml: xmlContent,
      lua: luaContent,
      contentSizeBytes: npcWithOwner.content_size_bytes,
      publishedAt: npcWithOwner.published_at,
      firstPublishedAt: npcWithOwner.first_published_at,
      deletedAt: npcWithOwner.deleted_at,
      owner: {
        id: npcWithOwner.owner.id,
        displayName: npcWithOwner.owner.display_name,
      },
    } satisfies NpcDetailResponseDto;
  }

  private async fetchNpcWithOwner(npcId: string, includeDraft: boolean, userId: string | null) {
    let query = this.supabase
      .from("npcs")
      .select(
        `
          id,
          name,
          status,
          system,
          implementation_type,
          script,
          look_type,
          look_type_id,
          look_item_id,
          look_head,
          look_body,
          look_legs,
          look_feet,
          look_addons,
          look_mount,
          health_now,
          health_max,
          walk_interval,
          floor_change,
          greet_message,
          farewell_message,
          decline_message,
          no_shop_message,
          on_close_shop_message,
          focus_enabled,
          travel_enabled,
          voice_enabled,
          shop_enabled,
          shop_mode,
          keywords_enabled,
          content_size_bytes,
          published_at,
          first_published_at,
          deleted_at,
          owner:profiles!npcs_owner_id_fkey(
            id,
            display_name
          )
        `
      )
      .eq("id", npcId);

    if (!includeDraft) {
      query = query.eq("status", "published");
    } else {
      if (!userId) {
        throw new NpcServiceError("NPC_ACCESS_FORBIDDEN", {
          cause: new Error("Draft access requires owner identifier"),
        });
      }

      query = query.eq("owner_id", userId);
    }

    const { data, error } = await query.limit(1).maybeSingle();

    if (error || !data) {
      if (isForbiddenSupabaseError(error)) {
        throw new NpcServiceError("NPC_ACCESS_FORBIDDEN", { cause: error });
      }

      if (error) {
        console.error("NpcService.fetchNpcWithOwner", error);
      }

      throw new NpcServiceError("NPC_NOT_FOUND", { cause: error ?? new Error("NPC not found") });
    }

    if (!data.owner) {
      throw new NpcServiceError("NPC_FETCH_FAILED", {
        cause: new Error("NPC owner data is missing"),
      });
    }

    return data;
  }

  private async fetchNpcXml(npcId: string, bucket: string): Promise<string> {
    const storageClient = this.ensureStorageClient();

    const { data, error } = await storageClient.storage.from(bucket).download(`${npcId}.xml`);

    if (error) {
      const status =
        typeof error === "object" && error !== null && "status" in error
          ? (error as { status?: number }).status
          : undefined;

      if (typeof status === "number" && status === 404) {
        throw new NpcServiceError("XML_NOT_FOUND", { cause: error });
      }

      console.error("NpcService.fetchNpcXml", error);
      throw new NpcServiceError("XML_FETCH_FAILED", { cause: error });
    }

    try {
      return await data.text();
    } catch (readError) {
      console.error("NpcService.fetchNpcXml text conversion", readError);
      throw new NpcServiceError("XML_FETCH_FAILED", { cause: readError });
    }
  }

  private async readLuaTemplate(luaFilePath: string): Promise<string> {
    const absolutePath = resolve(luaFilePath);

    try {
      const buffer = await readFile(absolutePath, { encoding: "utf-8" });
      return buffer;
    } catch (error) {
      console.error("NpcService.readLuaTemplate", error);
      throw new NpcServiceError("LUA_READ_FAILED", { cause: error });
    }
  }

  private ensureStorageClient(): SupabaseClient {
    if (this.storageClient) {
      return this.storageClient;
    }

    const url = import.meta.env.PUBLIC_SUPABASE_URL;
    const serviceKey = import.meta.env.SUPABASE_SECRET_KEY;

    if (!url || !serviceKey) {
      throw new NpcServiceError("XML_FETCH_FAILED", {
        cause: new Error("Supabase storage credentials are not configured"),
      });
    }

    this.storageClient = createClient<Database>(url, serviceKey, {
      auth: {
        persistSession: false,
      },
    }) as SupabaseClient;

    return this.storageClient;
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
