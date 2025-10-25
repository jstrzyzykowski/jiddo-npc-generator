import { createClient } from "@supabase/supabase-js";
import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { SupabaseClient } from "../../db/supabase.client";
import type { Database, Json } from "../../db/database.types";
import type {
  BulkReplaceNpcKeywordsCommand,
  CreateNpcCommand,
  CreateNpcShopItemCommand,
  DeleteNpcResponseDto,
  GenerationJobErrorCode,
  GenerationJobStatus,
  GenerationJobStatusResponseDto,
  GetFeaturedNpcsQueryDto,
  GetFeaturedNpcsResponseDto,
  GetNpcKeywordsQueryDto,
  GetNpcListQueryDto,
  GetNpcListResponseDto,
  NpcDetailResponseDto,
  NpcKeywordDto,
  NpcListItemDto,
  NpcListModulesDto,
  NpcListVisibilityFilter,
  NpcLookDto,
  NpcMessagesDto,
  NpcModulesDto,
  NpcOwnerSummaryDto,
  NpcShopItemDto,
  NpcStatsDto,
  PublishNpcResponseDto,
  TriggerNpcGenerationCommand,
  TriggerNpcGenerationQueryDto,
  TriggerNpcGenerationResponseDto,
  UpdateNpcCommand,
  UpdateNpcResponseDto,
} from "../../types";
import { createEvent as createTelemetryEvent, TelemetryServiceError } from "./telemetryService";
import { getElapsedMilliseconds } from "../utils";

type NpcInsert = Database["public"]["Tables"]["npcs"]["Insert"];
type NpcRow = Database["public"]["Tables"]["npcs"]["Row"];
type NpcStatus = Database["public"]["Enums"]["npc_status"];
type NpcUpdate = Database["public"]["Tables"]["npcs"]["Update"];
type NpcShopItemRow = Database["public"]["Tables"]["npc_shop_items"]["Row"];
type GenerationJobUpdateColumns = Pick<
  Database["public"]["Tables"]["npcs"]["Update"],
  | "generation_job_id"
  | "generation_job_status"
  | "generation_job_started_at"
  | "generation_job_error"
  | "content_size_bytes"
>;

type RawNpcKeywordRpcRow = Database["public"]["Functions"]["bulk_replace_npc_keywords"]["Returns"][number];

interface RawNpcKeywordRow {
  id: string;
  response: string;
  sort_index: number;
  created_at: string;
  updated_at: string;
  npc_keyword_phrases: RawNpcKeywordPhraseRow[] | null;
}

interface RawNpcKeywordPhraseRow {
  id: string;
  phrase: string;
  deleted_at: string | null;
}

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
  | "NPC_UPDATE_FAILED"
  | "NPC_DELETE_FAILED"
  | "NPC_ALREADY_DELETED"
  | "NPC_ALREADY_PUBLISHED"
  | "NPC_PUBLISH_FAILED"
  | "NPC_PUBLISH_CONFLICT"
  | "NPC_SHOP_ITEM_LIMIT_EXCEEDED"
  | "NPC_SHOP_ITEM_REPLACE_FAILED"
  | "NPC_KEYWORD_LIMIT_EXCEEDED"
  | "NPC_KEYWORD_CONFLICT"
  | "NPC_KEYWORD_REPLACE_FAILED"
  | "GENERATION_JOB_CONFLICT"
  | "GENERATION_JOB_UPDATE_FAILED"
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
const MOCK_XML_FILE_PATH = resolve("src", "assets", "mocks", "sample-npc.xml");
const MOCK_GENERATION_DELAY_MS = 3_000;
const KNOWN_GENERATION_JOB_ERROR_CODES = new Set<GenerationJobErrorCode>([
  "AI_TIMEOUT",
  "AI_INVALID_XML",
  "LIMIT_EXCEEDED",
]);
const GENERATION_STATUS_REFRESH_THRESHOLD_MS = 250;

const DEFAULT_LIST_LIMIT = 20;
const MAX_LIST_LIMIT = 100;
const FEATURED_LIMIT_MIN = 1;
const FEATURED_LIMIT_MAX = 10;
const FEATURED_LIMIT_DEFAULT = 10;
const KEYWORD_LIMIT_DEFAULT = 20;
const KEYWORD_LIMIT_MAX = 100;
const ALLOWED_SORT_FIELDS = ["published_at", "updated_at", "created_at"] as const;
const DEFAULT_SORT_FIELD = ALLOWED_SORT_FIELDS[0];
const DEFAULT_SORT_ORDER = "desc" as const;

const NPC_LIST_SELECT = `
  id,
  name,
  status,
  shop_enabled,
  keywords_enabled,
  published_at,
  updated_at,
  created_at,
  content_size_bytes,
  owner:profiles!npcs_owner_id_fkey (
    id,
    display_name
  )
` as const;

type SortField = (typeof ALLOWED_SORT_FIELDS)[number];
type SortOrder = "asc" | "desc";

interface NormalizedGetNpcListQuery {
  visibility: NpcListVisibilityFilter;
  status?: NpcStatus;
  search?: string;
  shopEnabled?: boolean;
  keywordsEnabled?: boolean;
  limit: number;
  cursor?: string;
  sort: SortField;
  order: SortOrder;
}

interface RawNpcListRow {
  id: string;
  name: string;
  status: NpcStatus;
  shop_enabled: boolean;
  keywords_enabled: boolean;
  published_at: string | null;
  updated_at: string;
  created_at: string;
  content_size_bytes: number;
  owner: {
    id: string;
    display_name: string;
  } | null;
}

interface NpcListCursorPayload {
  sortField: SortField;
  sortValue: string | null;
  id: string;
}

export class NpcService {
  async bulkReplaceNpcShopItems(
    npcId: string,
    items: CreateNpcShopItemCommand[],
    ownerId: string
  ): Promise<NpcShopItemDto[]> {
    if (!ownerId) {
      throw new NpcServiceError("NPC_SHOP_ITEM_REPLACE_FAILED", {
        cause: new Error("Missing owner identifier"),
      });
    }

    try {
      const { data, error } = await this.supabase.rpc("bulk_replace_npc_shop_items", {
        p_npc_id: npcId,
        p_items: {
          items: items.map(
            (item) =>
              ({
                listType: item.listType,
                name: item.name,
                itemId: item.itemId,
                price: item.price,
                subtype: item.subtype ?? 0,
                charges: item.charges ?? 0,
                realName: item.realName ?? null,
                containerItemId: item.containerItemId ?? null,
              }) satisfies CreateNpcShopItemCommand
          ),
        } satisfies { items: CreateNpcShopItemCommand[] },
      });

      if (error) {
        if (isForbiddenSupabaseError(error)) {
          throw new NpcServiceError("NPC_ACCESS_FORBIDDEN", { cause: error });
        }

        if (matchesShopItemLimitError(error)) {
          throw new NpcServiceError("NPC_SHOP_ITEM_LIMIT_EXCEEDED", { cause: error });
        }

        if (matchesNpcNotFoundError(error)) {
          throw new NpcServiceError("NPC_NOT_FOUND", { cause: error });
        }

        console.error("NpcService.bulkReplaceNpcShopItems rpc error", error);
        throw new NpcServiceError("NPC_SHOP_ITEM_REPLACE_FAILED", { cause: error });
      }

      const rows = (data ?? []) as NpcShopItemRow[];
      return rows
        .filter((row) => !row.deleted_at)
        .map(
          (row) =>
            ({
              id: row.id,
              listType: row.list_type,
              name: row.name,
              itemId: row.item_id,
              price: row.price,
              subtype: row.subtype,
              charges: row.charges,
              realName: row.real_name,
              containerItemId: row.container_item_id,
              createdAt: row.created_at,
              updatedAt: row.updated_at,
            }) satisfies NpcShopItemDto
        );
    } catch (error) {
      if (error instanceof NpcServiceError) {
        throw error;
      }

      console.error("NpcService.bulkReplaceNpcShopItems unexpected error", error);
      throw new NpcServiceError("NPC_SHOP_ITEM_REPLACE_FAILED", { cause: error });
    }
  }

  async bulkReplaceNpcKeywords(
    npcId: string,
    ownerId: string,
    command: BulkReplaceNpcKeywordsCommand
  ): Promise<NpcKeywordDto[]> {
    if (!ownerId) {
      throw new NpcServiceError("NPC_KEYWORD_REPLACE_FAILED", {
        cause: new Error("Missing owner identifier"),
      });
    }

    try {
      const payload: Json = {
        items: command.items.map((item) => ({
          response: item.response.trim(),
          sortIndex: item.sortIndex,
          phrases: item.phrases.map((phrase) => phrase.trim()),
        })),
      };

      const { data, error } = await this.supabase.rpc("bulk_replace_npc_keywords", {
        p_npc_id: npcId,
        p_owner_id: ownerId,
        p_keywords: payload,
      });

      if (error) {
        if (isForbiddenSupabaseError(error)) {
          throw new NpcServiceError("NPC_ACCESS_FORBIDDEN", { cause: error });
        }

        if (matchesKeywordLimitError(error)) {
          throw new NpcServiceError("NPC_KEYWORD_LIMIT_EXCEEDED", { cause: error });
        }

        if (matchesKeywordConflictError(error)) {
          throw new NpcServiceError("NPC_KEYWORD_CONFLICT", { cause: error });
        }

        if (matchesNpcNotFoundError(error)) {
          throw new NpcServiceError("NPC_NOT_FOUND", { cause: error });
        }

        console.error("NpcService.bulkReplaceNpcKeywords rpc error", error);
        throw new NpcServiceError("NPC_KEYWORD_REPLACE_FAILED", { cause: error });
      }

      const rows = (data ?? []) as RawNpcKeywordRpcRow[];

      return rows.map((row) => mapRpcKeywordRow(row));
    } catch (error) {
      if (error instanceof NpcServiceError) {
        throw error;
      }

      console.error("NpcService.bulkReplaceNpcKeywords unexpected error", error);
      throw new NpcServiceError("NPC_KEYWORD_REPLACE_FAILED", { cause: error });
    }
  }

  async getNpcKeywords(npcId: string, query: GetNpcKeywordsQueryDto = {}): Promise<NpcKeywordDto[]> {
    const limit = normalizeKeywordLimit(query.limit);

    try {
      const { data, error } = await this.supabase
        .from("npc_keywords")
        .select(
          `
            id,
            response,
            sort_index,
            created_at,
            updated_at,
            npc_keyword_phrases (
              id,
              phrase,
              deleted_at
            )
          `
        )
        .eq("npc_id", npcId)
        .is("deleted_at", null)
        .order("sort_index", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true })
        .limit(limit);

      if (error) {
        if (isForbiddenSupabaseError(error)) {
          throw new NpcServiceError("NPC_ACCESS_FORBIDDEN", { cause: error });
        }

        console.error("NpcService.getNpcKeywords query error", error);
        throw new NpcServiceError("NPC_FETCH_FAILED", { cause: error });
      }

      const rows = (data ?? []) as RawNpcKeywordRow[];

      if (rows.length === 0) {
        const { data: npcRow, error: npcError } = await this.supabase
          .from("npcs")
          .select("id")
          .eq("id", npcId)
          .is("deleted_at", null)
          .maybeSingle();

        if (npcError) {
          if (isForbiddenSupabaseError(npcError)) {
            throw new NpcServiceError("NPC_ACCESS_FORBIDDEN", { cause: npcError });
          }

          console.error("NpcService.getNpcKeywords npc lookup error", npcError);
          throw new NpcServiceError("NPC_FETCH_FAILED", { cause: npcError });
        }

        if (!npcRow) {
          throw new NpcServiceError("NPC_NOT_FOUND", {
            cause: new Error("NPC not found or not accessible"),
          });
        }

        return [];
      }

      return rows.map((row) => mapKeywordRow(row));
    } catch (error) {
      if (error instanceof NpcServiceError) {
        throw error;
      }

      console.error("NpcService.getNpcKeywords unexpected error", error);
      throw new NpcServiceError("NPC_FETCH_FAILED", { cause: error });
    }
  }

  async getNpcShopItems(npcId: string, options: { listType?: "buy" | "sell" } = {}): Promise<NpcShopItemDto[]> {
    const { listType } = options;

    let query = this.supabase
      .from("npc_shop_items")
      .select(
        `id, list_type, name, item_id, price, subtype, charges, real_name, container_item_id, created_at, updated_at`
      )
      .eq("npc_id", npcId)
      .is("deleted_at", null);

    if (listType) {
      query = query.eq("list_type", listType);
    }

    const { data, error } = await query.order("created_at", { ascending: true }).order("id", { ascending: true });

    if (error) {
      if (isForbiddenSupabaseError(error)) {
        throw new NpcServiceError("NPC_ACCESS_FORBIDDEN", { cause: error });
      }

      if (matchesNpcNotFoundError(error)) {
        throw new NpcServiceError("NPC_NOT_FOUND", { cause: error });
      }

      console.error("NpcService.getNpcShopItems", error);
      throw new NpcServiceError("NPC_FETCH_FAILED", { cause: error });
    }

    const rows = (data ?? []) as NpcShopItemRow[];

    return rows.map(
      (row) =>
        ({
          id: row.id,
          listType: row.list_type,
          name: row.name,
          itemId: row.item_id,
          price: row.price,
          subtype: row.subtype,
          charges: row.charges,
          realName: row.real_name,
          containerItemId: row.container_item_id,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }) satisfies NpcShopItemDto
    );
  }

  async startGenerationJob(
    npcId: string,
    ownerId: string,
    _command: TriggerNpcGenerationCommand,
    query: TriggerNpcGenerationQueryDto
  ): Promise<TriggerNpcGenerationResponseDto> {
    if (!ownerId) {
      throw new NpcServiceError("GENERATION_JOB_UPDATE_FAILED", {
        cause: new Error("Missing owner identifier"),
      });
    }

    const npc = await this.fetchNpcForGeneration(npcId, ownerId);

    if (!query.force) {
      this.ensureNoActiveJob(npc.generation_job_status);
    }

    const jobId = randomUUID();
    const submittedAt = new Date().toISOString();

    await this.updateGenerationJob(npcId, {
      generation_job_id: jobId,
      generation_job_status: "queued",
      generation_job_started_at: submittedAt,
      generation_job_error: null,
    });

    return {
      jobId,
      status: "queued",
      npcId,
      submittedAt,
    } satisfies TriggerNpcGenerationResponseDto;
  }

  async getGenerationJobStatus(npcId: string, jobId: string, ownerId: string): Promise<GenerationJobStatusResponseDto> {
    if (!ownerId) {
      throw new NpcServiceError("GENERATION_JOB_UPDATE_FAILED", {
        cause: new Error("Missing owner identifier"),
      });
    }

    const npc = await this.fetchNpcForGenerationStatus(npcId, jobId, ownerId);
    const status = npc.generation_job_status ?? "queued";

    if (!npc.generation_job_started_at) {
      throw new NpcServiceError("GENERATION_JOB_UPDATE_FAILED", {
        cause: new Error("Generation job start time is missing"),
      });
    }

    const elapsedMs = getElapsedMilliseconds(npc.generation_job_started_at);
    if (elapsedMs === null) {
      throw new NpcServiceError("GENERATION_JOB_UPDATE_FAILED", {
        cause: new Error("Unable to compute elapsed time for generation job"),
      });
    }

    if (status === "succeeded") {
      const xmlContent = await this.readMockXml();
      const contentSizeBytes = Buffer.byteLength(xmlContent, "utf8");

      if (npc.content_size_bytes !== contentSizeBytes) {
        await this.updateGenerationJob(npcId, {
          content_size_bytes: contentSizeBytes,
        });
      }

      return {
        jobId,
        npcId,
        status: "succeeded",
        xml: xmlContent,
        contentSizeBytes,
        error: null,
        updatedAt: new Date().toISOString(),
      } satisfies GenerationJobStatusResponseDto;
    }

    if (status === "failed") {
      return {
        jobId,
        npcId,
        status: "failed",
        xml: null,
        contentSizeBytes: npc.content_size_bytes,
        error: normalizeGenerationJobError(npc.generation_job_error),
        updatedAt: new Date().toISOString(),
      } satisfies GenerationJobStatusResponseDto;
    }

    if (elapsedMs < MOCK_GENERATION_DELAY_MS) {
      if (status !== "processing" && elapsedMs >= GENERATION_STATUS_REFRESH_THRESHOLD_MS) {
        await this.updateGenerationJob(npcId, {
          generation_job_status: "processing",
        });
      }

      return {
        jobId,
        npcId,
        status: "processing",
        xml: null,
        contentSizeBytes: npc.content_size_bytes,
        error: null,
        updatedAt: new Date().toISOString(),
      } satisfies GenerationJobStatusResponseDto;
    }

    const xmlContent = await this.readMockXml();
    const contentSizeBytes = Buffer.byteLength(xmlContent, "utf8");

    await this.updateGenerationJob(npcId, {
      generation_job_status: "succeeded",
      generation_job_error: null,
      content_size_bytes: contentSizeBytes,
    });

    return {
      jobId,
      npcId,
      status: "succeeded",
      xml: xmlContent,
      contentSizeBytes,
      error: null,
      updatedAt: new Date().toISOString(),
    } satisfies GenerationJobStatusResponseDto;
  }

  async getFeaturedNpcs(query: GetFeaturedNpcsQueryDto): Promise<GetFeaturedNpcsResponseDto> {
    const limit = normalizeFeaturedLimit(query.limit);

    const { data, error } = await this.supabase
      .from("npcs")
      .select<typeof NPC_LIST_SELECT, RawNpcListRow>(NPC_LIST_SELECT)
      .eq("status", "published")
      .is("deleted_at", null)
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("id", { ascending: false })
      .limit(limit);

    if (error) {
      if (isForbiddenSupabaseError(error)) {
        throw new NpcServiceError("NPC_ACCESS_FORBIDDEN", { cause: error });
      }

      console.error("NpcService.getFeaturedNpcs", error);
      throw new NpcServiceError("NPC_FETCH_FAILED", { cause: error });
    }

    const rows = (data ?? []) as RawNpcListRow[];

    const items = rows.map((row) => mapToNpcListItem(row));

    return {
      items,
    } satisfies GetFeaturedNpcsResponseDto;
  }

  async getNpcList(query: GetNpcListQueryDto, userId: string | null): Promise<GetNpcListResponseDto> {
    const normalizedQuery = normalizeNpcListQuery(query);

    if (requiresAuthentication(normalizedQuery.visibility) && !userId) {
      throw new NpcServiceError("NPC_ACCESS_FORBIDDEN", {
        cause: new Error("Authenticated user is required for the requested visibility"),
      });
    }

    const limitPlusOne = normalizedQuery.limit + 1;

    const builder = buildNpcListQuery(this.supabase, normalizedQuery, userId);
    const { data, error } = await builder.limit(limitPlusOne);

    if (error) {
      if (isForbiddenSupabaseError(error)) {
        throw new NpcServiceError("NPC_ACCESS_FORBIDDEN", { cause: error });
      }

      console.error("NpcService.getNpcList", error);
      throw new NpcServiceError("NPC_FETCH_FAILED", { cause: error });
    }

    const rows = (data ?? []) as RawNpcListRow[];
    const hasNextPage = rows.length > normalizedQuery.limit;
    const limitedRows = hasNextPage ? rows.slice(0, normalizedQuery.limit) : rows;

    const items = limitedRows.map((row) => mapToNpcListItem(row));
    const lastRow = limitedRows.at(-1) ?? null;
    const nextCursor =
      hasNextPage && lastRow
        ? encodeCursor({
            sortField: normalizedQuery.sort,
            sortValue: getSortFieldValue(lastRow, normalizedQuery.sort),
            id: lastRow.id,
          })
        : null;

    return {
      items,
      pageInfo: {
        nextCursor,
        total: null,
      },
    } satisfies GetNpcListResponseDto;
  }

  private serviceRoleClient: SupabaseClient | null = null;

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

  async updateNpc(npcId: string, command: UpdateNpcCommand, ownerId: string): Promise<UpdateNpcResponseDto> {
    if (!ownerId) {
      throw new NpcServiceError("NPC_UPDATE_FAILED", {
        cause: new Error("Missing owner identifier"),
      });
    }

    const updatePayload = mapToNpcUpdate(command);

    if (Object.keys(updatePayload).length === 0) {
      throw new NpcServiceError("NPC_UPDATE_FAILED", {
        cause: new Error("No fields to update"),
      });
    }

    const { data, error } = await this.supabase
      .from("npcs")
      .update(updatePayload)
      .eq("id", npcId)
      .eq("owner_id", ownerId)
      .select(
        `
          id,
          name,
          status,
          published_at,
          updated_at,
          content_size_bytes,
          shop_enabled,
          keywords_enabled,
          owner:profiles!npcs_owner_id_fkey (
            id,
            display_name
          )
        `
      )
      .maybeSingle();

    if (error) {
      if (isForbiddenSupabaseError(error)) {
        throw new NpcServiceError("NPC_ACCESS_FORBIDDEN", { cause: error });
      }

      console.error("NpcService.updateNpc", error);
      throw new NpcServiceError("NPC_UPDATE_FAILED", { cause: error });
    }

    if (!data) {
      throw new NpcServiceError("NPC_NOT_FOUND", {
        cause: new Error("NPC update returned no rows"),
      });
    }

    const owner = data.owner;
    if (!owner) {
      throw new NpcServiceError("NPC_UPDATE_FAILED", {
        cause: new Error("Owner data missing after update"),
      });
    }

    return {
      id: data.id,
      name: data.name,
      owner: {
        id: owner.id,
        displayName: owner.display_name,
      },
      status: data.status,
      modules: {
        shopEnabled: data.shop_enabled,
        keywordsEnabled: data.keywords_enabled,
      },
      publishedAt: data.published_at,
      updatedAt: data.updated_at,
      contentSizeBytes: data.content_size_bytes,
    } satisfies UpdateNpcResponseDto;
  }

  async softDeleteNpc({
    npcId,
    userId,
    reason,
  }: {
    npcId: string;
    userId: string;
    reason?: string;
  }): Promise<DeleteNpcResponseDto> {
    if (!userId) {
      throw new NpcServiceError("NPC_DELETE_FAILED", {
        cause: new Error("Missing owner identifier"),
      });
    }

    const now = new Date().toISOString();

    const { data, error } = await this.supabase
      .from("npcs")
      .select("id, deleted_at")
      .eq("id", npcId)
      .eq("owner_id", userId)
      .maybeSingle();

    if (error) {
      if (isForbiddenSupabaseError(error)) {
        throw new NpcServiceError("NPC_ACCESS_FORBIDDEN", { cause: error });
      }

      console.error("NpcService.softDeleteNpc fetch", error);
      throw new NpcServiceError("NPC_DELETE_FAILED", { cause: error });
    }

    if (!data) {
      throw new NpcServiceError("NPC_NOT_FOUND", {
        cause: new Error("NPC soft delete fetch returned no rows"),
      });
    }

    if (data.deleted_at) {
      throw new NpcServiceError("NPC_ALREADY_DELETED", {
        cause: new Error("NPC was already soft deleted"),
      });
    }

    const { error: updateError } = await this.supabase.from("npcs").update({ deleted_at: now }).eq("id", npcId);

    if (updateError) {
      if (isForbiddenSupabaseError(updateError)) {
        throw new NpcServiceError("NPC_ACCESS_FORBIDDEN", { cause: updateError });
      }

      console.error("NpcService.softDeleteNpc update", updateError);
      throw new NpcServiceError("NPC_DELETE_FAILED", { cause: updateError });
    }

    if (reason) {
      try {
        await createTelemetryEvent({
          supabase: this.supabase,
          event: {
            eventType: "NPC_DELETED",
            npcId,
            userId,
            metadata: { reason },
          },
        });
      } catch (telemetryError) {
        if (telemetryError instanceof TelemetryServiceError) {
          console.error("NpcService.softDeleteNpc telemetry", telemetryError);
        } else {
          console.error("NpcService.softDeleteNpc telemetry unexpected", telemetryError);
        }
      }
    }

    return {
      id: data.id,
      deletedAt: now,
    } satisfies DeleteNpcResponseDto;
  }

  async publishNpc(npcId: string, ownerId: string): Promise<PublishNpcResponseDto> {
    if (!ownerId) {
      throw new NpcServiceError("NPC_PUBLISH_FAILED", {
        cause: new Error("Missing owner identifier"),
      });
    }

    const { data: npc, error: fetchError } = await this.supabase
      .from("npcs")
      .select("id, owner_id, status")
      .eq("id", npcId)
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      if (isForbiddenSupabaseError(fetchError)) {
        throw new NpcServiceError("NPC_ACCESS_FORBIDDEN", { cause: fetchError });
      }

      console.error("NpcService.publishNpc fetch", fetchError);
      throw new NpcServiceError("NPC_FETCH_FAILED", { cause: fetchError });
    }

    if (!npc) {
      throw new NpcServiceError("NPC_NOT_FOUND", {
        cause: new Error("NPC not found for publish"),
      });
    }

    if (npc.owner_id !== ownerId) {
      throw new NpcServiceError("NPC_ACCESS_FORBIDDEN", {
        cause: new Error("NPC does not belong to user"),
      });
    }

    if (npc.status !== "draft") {
      throw new NpcServiceError("NPC_ALREADY_PUBLISHED", {
        cause: new Error("NPC status is not draft"),
      });
    }

    const { data: updatedNpc, error: updateError } = await this.supabase
      .from("npcs")
      .update({ status: "published" })
      .eq("id", npcId)
      .eq("owner_id", ownerId)
      .eq("status", "draft")
      .select("id, status, published_at, first_published_at")
      .limit(1)
      .maybeSingle();

    if (updateError) {
      if (isForbiddenSupabaseError(updateError)) {
        throw new NpcServiceError("NPC_ACCESS_FORBIDDEN", { cause: updateError });
      }

      if (isPublishConflictError(updateError)) {
        throw new NpcServiceError("NPC_PUBLISH_CONFLICT", { cause: updateError });
      }

      console.error("NpcService.publishNpc update", updateError);
      throw new NpcServiceError("NPC_PUBLISH_FAILED", { cause: updateError });
    }

    if (!updatedNpc) {
      throw new NpcServiceError("NPC_PUBLISH_FAILED", {
        cause: new Error("Publish update returned no data"),
      });
    }

    if (updatedNpc.status !== "published") {
      throw new NpcServiceError("NPC_PUBLISH_FAILED", {
        cause: new Error(`Unexpected NPC status after publish: ${updatedNpc.status}`),
      });
    }

    if (!updatedNpc.published_at) {
      throw new NpcServiceError("NPC_PUBLISH_FAILED", {
        cause: new Error("NPC published_at is missing after publish"),
      });
    }

    try {
      await createTelemetryEvent({
        supabase: this.supabase,
        event: {
          eventType: "NPC_PUBLISHED",
          npcId: updatedNpc.id,
          userId: ownerId,
        },
      });
    } catch (error) {
      if (error instanceof TelemetryServiceError) {
        console.error("NpcService.publishNpc telemetry", error);
      } else {
        console.error("NpcService.publishNpc telemetry unexpected", error);
      }
    }

    return {
      id: updatedNpc.id,
      status: "published",
      publishedAt: updatedNpc.published_at,
      firstPublishedAt: updatedNpc.first_published_at,
    } satisfies PublishNpcResponseDto;
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
    return this.ensureServiceRoleClient("XML_FETCH_FAILED");
  }

  private ensureServiceRoleClient(
    errorCode: Extract<NpcServiceErrorCode, "GENERATION_JOB_UPDATE_FAILED" | "XML_FETCH_FAILED">
  ): SupabaseClient {
    if (this.serviceRoleClient) {
      return this.serviceRoleClient;
    }

    const url = import.meta.env.PUBLIC_SUPABASE_URL;
    const serviceKey = import.meta.env.SUPABASE_SECRET_KEY;

    if (!url || !serviceKey) {
      throw new NpcServiceError(errorCode, {
        cause: new Error("Supabase service credentials are not configured"),
      });
    }

    this.serviceRoleClient = createClient<Database>(url, serviceKey, {
      auth: {
        persistSession: false,
      },
    }) as SupabaseClient;

    return this.serviceRoleClient;
  }

  private async fetchNpcForGeneration(
    npcId: string,
    ownerId: string
  ): Promise<Pick<NpcRow, "id" | "owner_id" | "generation_job_status">> {
    const { data, error } = await this.supabase
      .from("npcs")
      .select("id, owner_id, generation_job_status")
      .eq("id", npcId)
      .limit(1)
      .maybeSingle();

    if (error) {
      if (isForbiddenSupabaseError(error)) {
        throw new NpcServiceError("NPC_ACCESS_FORBIDDEN", { cause: error });
      }

      console.error("NpcService.fetchNpcForGeneration", error);
      throw new NpcServiceError("NPC_FETCH_FAILED", { cause: error });
    }

    if (!data) {
      throw new NpcServiceError("NPC_NOT_FOUND", {
        cause: new Error("NPC not found for generation"),
      });
    }

    if (data.owner_id !== ownerId) {
      throw new NpcServiceError("NPC_ACCESS_FORBIDDEN", {
        cause: new Error("NPC does not belong to user"),
      });
    }

    return {
      id: data.id,
      owner_id: data.owner_id,
      generation_job_status: data.generation_job_status,
    };
  }

  private ensureNoActiveJob(status: GenerationJobStatus | null): void {
    if (!status) {
      return;
    }

    if (status === "queued" || status === "processing") {
      throw new NpcServiceError("GENERATION_JOB_CONFLICT", {
        cause: new Error(`Generation job already in progress (status: ${status}).`),
      });
    }
  }

  private async updateGenerationJob(npcId: string, payload: Partial<GenerationJobUpdateColumns>): Promise<void> {
    if (!payload || Object.keys(payload).length === 0) {
      return;
    }

    const client = this.ensureServiceRoleClient("GENERATION_JOB_UPDATE_FAILED");

    const { error } = await client.from("npcs").update(payload).eq("id", npcId).select("id").maybeSingle();

    if (error) {
      console.error("NpcService.updateGenerationJob", error);
      throw new NpcServiceError("GENERATION_JOB_UPDATE_FAILED", { cause: error });
    }
  }

  private async fetchNpcForGenerationStatus(
    npcId: string,
    jobId: string,
    ownerId: string
  ): Promise<
    Pick<
      NpcRow,
      | "id"
      | "owner_id"
      | "generation_job_id"
      | "generation_job_status"
      | "generation_job_started_at"
      | "generation_job_error"
      | "content_size_bytes"
    >
  > {
    const { data, error } = await this.supabase
      .from("npcs")
      .select(
        "id, owner_id, generation_job_id, generation_job_status, generation_job_started_at, generation_job_error, content_size_bytes"
      )
      .eq("id", npcId)
      .limit(1)
      .maybeSingle();

    if (error) {
      if (isForbiddenSupabaseError(error)) {
        throw new NpcServiceError("NPC_ACCESS_FORBIDDEN", { cause: error });
      }

      console.error("NpcService.fetchNpcForGenerationStatus", error);
      throw new NpcServiceError("NPC_FETCH_FAILED", { cause: error });
    }

    if (!data) {
      throw new NpcServiceError("NPC_NOT_FOUND", {
        cause: new Error("NPC not found for generation status"),
      });
    }

    if (data.owner_id !== ownerId) {
      throw new NpcServiceError("NPC_ACCESS_FORBIDDEN", {
        cause: new Error("NPC does not belong to user"),
      });
    }

    if (!data.generation_job_id || data.generation_job_id !== jobId) {
      throw new NpcServiceError("NPC_NOT_FOUND", {
        cause: new Error("Generation job does not exist for NPC"),
      });
    }

    return data;
  }

  private async readMockXml(): Promise<string> {
    try {
      return await readFile(MOCK_XML_FILE_PATH, "utf8");
    } catch (error) {
      console.error("NpcService.readMockXml", error);
      throw new NpcServiceError("XML_FETCH_FAILED", { cause: error });
    }
  }
}

function normalizeGenerationJobError(error: unknown): GenerationJobStatusResponseDto["error"] {
  if (!error || typeof error !== "object") {
    return null;
  }

  const candidate = error as Partial<{ code: unknown; message: unknown }>;
  if (typeof candidate.code !== "string" || typeof candidate.message !== "string") {
    return null;
  }

  if (!KNOWN_GENERATION_JOB_ERROR_CODES.has(candidate.code as GenerationJobErrorCode)) {
    return null;
  }

  return {
    code: candidate.code as GenerationJobErrorCode,
    message: candidate.message,
  };
}

function normalizeKeywordLimit(limit: number | undefined): number {
  if (typeof limit !== "number" || !Number.isFinite(limit)) {
    return KEYWORD_LIMIT_DEFAULT;
  }

  const coerced = Math.floor(limit);

  if (coerced < 1) {
    return 1;
  }

  if (coerced > KEYWORD_LIMIT_MAX) {
    return KEYWORD_LIMIT_MAX;
  }

  return coerced;
}

function normalizeNpcListQuery(query: GetNpcListQueryDto): NormalizedGetNpcListQuery {
  const visibility = (query.visibility ?? "public") as NpcListVisibilityFilter;
  const limitInput = typeof query.limit === "number" && Number.isFinite(query.limit) ? query.limit : DEFAULT_LIST_LIMIT;
  const limit = Math.min(Math.max(limitInput, 1), MAX_LIST_LIMIT);

  const sort = isSortField(query.sort) ? query.sort : DEFAULT_SORT_FIELD;
  const order: SortOrder = query.order === "asc" ? "asc" : DEFAULT_SORT_ORDER;

  return {
    visibility,
    status: query.status,
    search: query.search?.trim() || undefined,
    shopEnabled: typeof query.shopEnabled === "boolean" ? query.shopEnabled : undefined,
    keywordsEnabled: typeof query.keywordsEnabled === "boolean" ? query.keywordsEnabled : undefined,
    limit,
    cursor: query.cursor,
    sort,
    order,
  } satisfies NormalizedGetNpcListQuery;
}

function normalizeFeaturedLimit(limit: number | undefined): number {
  if (typeof limit !== "number" || !Number.isFinite(limit)) {
    return FEATURED_LIMIT_DEFAULT;
  }

  const clamped = Math.floor(limit);

  if (clamped < FEATURED_LIMIT_MIN) {
    return FEATURED_LIMIT_MIN;
  }

  if (clamped > FEATURED_LIMIT_MAX) {
    return FEATURED_LIMIT_MAX;
  }

  return clamped;
}

function requiresAuthentication(visibility: NpcListVisibilityFilter): boolean {
  return visibility !== "public";
}

function buildNpcListQuery(supabase: SupabaseClient, query: NormalizedGetNpcListQuery, userId: string | null) {
  let builder = supabase
    .from("npcs")
    .select<typeof NPC_LIST_SELECT, RawNpcListRow>(NPC_LIST_SELECT)
    .is("deleted_at", null);

  switch (query.visibility) {
    case "public":
      builder = builder.eq("status", "published");
      break;
    case "mine":
      if (!userId) {
        throw new NpcServiceError("NPC_ACCESS_FORBIDDEN", {
          cause: new Error("Authenticated user identifier is required for mine visibility"),
        });
      }

      builder = builder.eq("owner_id", userId);
      break;
    case "all":
      break;
  }

  if (query.status) {
    builder = builder.eq("status", query.status);
  }

  if (query.search) {
    builder = builder.ilike("name", `%${query.search}%`);
  }

  if (typeof query.shopEnabled === "boolean") {
    builder = builder.eq("shop_enabled", query.shopEnabled);
  }

  if (typeof query.keywordsEnabled === "boolean") {
    builder = builder.eq("keywords_enabled", query.keywordsEnabled);
  }

  if (query.cursor) {
    builder = applyCursorFilter(builder, query);
  }

  const isAscending = query.order === "asc";

  builder = builder.order(query.sort, {
    ascending: isAscending,
    nullsFirst: false,
  });

  builder = builder.order("id", { ascending: isAscending });

  return builder;
}

function applyCursorFilter(builder: ReturnType<typeof buildNpcListQuery>, query: NormalizedGetNpcListQuery) {
  if (!query.cursor) {
    return builder;
  }

  const cursor = decodeCursor(query.cursor);

  if (cursor.sortField !== query.sort) {
    throw new NpcServiceError("NPC_FETCH_FAILED", {
      cause: new Error("Cursor sort field does not match the requested sort parameter"),
    });
  }

  if (cursor.sortValue === null) {
    const encodedId = encodeFilterValue(cursor.id);
    const comparator = query.order === "asc" ? "gt" : "lt";
    return builder.or(`and(${query.sort}.is.null,id.${comparator}.${encodedId})`);
  }

  const encodedSortValue = encodeFilterValue(cursor.sortValue);
  const encodedId = encodeFilterValue(cursor.id);
  const comparator = query.order === "asc" ? "gt" : "lt";
  const tieBreakerComparator = comparator;

  const cursorFilters = [
    `${query.sort}.${comparator}.${encodedSortValue}`,
    `and(${query.sort}.eq.${encodedSortValue},id.${tieBreakerComparator}.${encodedId})`,
    `${query.sort}.is.null`,
  ];

  return builder.or(cursorFilters.join(","));
}

function encodeCursor(payload: NpcListCursorPayload): string {
  const serialized = JSON.stringify(payload);
  return Buffer.from(serialized, "utf-8").toString("base64url");
}

function decodeCursor(token: string): NpcListCursorPayload {
  try {
    const json = Buffer.from(token, "base64url").toString("utf-8");
    const parsed = JSON.parse(json) as Partial<NpcListCursorPayload>;

    if (!parsed || typeof parsed !== "object") {
      throw new Error("Cursor payload is not an object");
    }

    if (!isSortField(parsed.sortField)) {
      throw new Error("Cursor sort field is invalid");
    }

    if (typeof parsed.id !== "string" || parsed.id.length === 0) {
      throw new Error("Cursor id is invalid");
    }

    if (parsed.sortValue !== null && typeof parsed.sortValue !== "string") {
      throw new Error("Cursor sort value must be a string or null");
    }

    return {
      sortField: parsed.sortField,
      sortValue: parsed.sortValue ?? null,
      id: parsed.id,
    } satisfies NpcListCursorPayload;
  } catch (error) {
    throw new NpcServiceError("NPC_FETCH_FAILED", {
      cause: error,
    });
  }
}

function encodeFilterValue(value: string): string {
  return encodeURIComponent(value);
}

function getSortFieldValue(row: RawNpcListRow, sortField: SortField): string | null {
  switch (sortField) {
    case "published_at":
      return row.published_at;
    case "updated_at":
      return row.updated_at;
    case "created_at":
      return row.created_at;
    default:
      return null;
  }
}

function mapToNpcListItem(row: RawNpcListRow): NpcListItemDto {
  if (!row.owner) {
    throw new NpcServiceError("NPC_FETCH_FAILED", {
      cause: new Error("Owner information is missing for NPC record"),
    });
  }

  const modules: NpcListModulesDto = {
    shopEnabled: row.shop_enabled,
    keywordsEnabled: row.keywords_enabled,
  };

  return {
    id: row.id,
    name: row.name,
    owner: {
      id: row.owner.id,
      displayName: row.owner.display_name,
    } satisfies NpcOwnerSummaryDto,
    status: row.status,
    modules,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    contentSizeBytes: row.content_size_bytes,
  } satisfies NpcListItemDto;
}

function mapToNpcUpdate(command: UpdateNpcCommand): NpcUpdate {
  const update: NpcUpdate = {};

  if (command.clientRequestId !== undefined) {
    update.client_request_id = command.clientRequestId ?? null;
  }

  if (command.name !== undefined) {
    update.name = command.name ?? null;
  }

  if (command.contentSizeBytes !== undefined) {
    update.content_size_bytes = command.contentSizeBytes ?? null;
  }

  if (command.look) {
    const look = command.look;

    if (look.type !== undefined) {
      update.look_type = look.type ?? null;
    }

    if (look.typeId !== undefined) {
      update.look_type_id = look.typeId ?? null;
    }

    if (look.itemId !== undefined) {
      update.look_item_id = look.itemId ?? null;
    }

    if (look.head !== undefined) {
      update.look_head = look.head ?? null;
    }

    if (look.body !== undefined) {
      update.look_body = look.body ?? null;
    }

    if (look.legs !== undefined) {
      update.look_legs = look.legs ?? null;
    }

    if (look.feet !== undefined) {
      update.look_feet = look.feet ?? null;
    }

    if (look.addons !== undefined) {
      update.look_addons = look.addons ?? null;
    }

    if (look.mount !== undefined) {
      update.look_mount = look.mount ?? null;
    }
  }

  if (command.stats) {
    const stats = command.stats;

    if (stats.healthNow !== undefined) {
      update.health_now = stats.healthNow ?? null;
    }

    if (stats.healthMax !== undefined) {
      update.health_max = stats.healthMax ?? null;
    }

    if (stats.walkInterval !== undefined) {
      update.walk_interval = stats.walkInterval ?? null;
    }

    if (stats.floorChange !== undefined) {
      update.floor_change = stats.floorChange ?? null;
    }
  }

  if (command.messages) {
    const messages = command.messages;

    if (messages.greet !== undefined) {
      update.greet_message = messages.greet ?? null;
    }

    if (messages.farewell !== undefined) {
      update.farewell_message = messages.farewell ?? null;
    }

    if (messages.decline !== undefined) {
      update.decline_message = messages.decline ?? null;
    }

    if (messages.noShop !== undefined) {
      update.no_shop_message = messages.noShop ?? null;
    }

    if (messages.onCloseShop !== undefined) {
      update.on_close_shop_message = messages.onCloseShop ?? null;
    }
  }

  if (command.modules) {
    const modules = command.modules;

    if (modules.focusEnabled !== undefined) {
      update.focus_enabled = modules.focusEnabled ?? null;
    }

    if (modules.travelEnabled !== undefined) {
      update.travel_enabled = modules.travelEnabled ?? null;
    }

    if (modules.voiceEnabled !== undefined) {
      update.voice_enabled = modules.voiceEnabled ?? null;
    }

    if (modules.shopEnabled !== undefined) {
      update.shop_enabled = modules.shopEnabled ?? null;
    }

    if (modules.shopMode !== undefined) {
      update.shop_mode = modules.shopMode ?? null;
    }

    if (modules.keywordsEnabled !== undefined) {
      update.keywords_enabled = modules.keywordsEnabled ?? null;
    }
  }

  return update;
}

function isSortField(value: unknown): value is SortField {
  return typeof value === "string" && (ALLOWED_SORT_FIELDS as readonly string[]).includes(value);
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

function matchesShopItemLimitError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { message?: string; details?: string; code?: string };

  if (typeof candidate.code === "string" && candidate.code === "P0001") {
    return true;
  }

  const message = typeof candidate.message === "string" ? candidate.message : candidate.details;
  return typeof message === "string" && message.includes("NPC_SHOP_ITEM_LIMIT_EXCEEDED");
}

function matchesKeywordLimitError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { message?: string; details?: string; code?: string };

  if (candidate.code === "P0001") {
    const diagnostic = typeof candidate.message === "string" ? candidate.message : candidate.details;
    return typeof diagnostic === "string" && diagnostic.includes("NPC_KEYWORD_LIMIT_EXCEEDED");
  }

  const message = typeof candidate.message === "string" ? candidate.message : candidate.details;
  return typeof message === "string" && message.includes("NPC_KEYWORD_LIMIT_EXCEEDED");
}

function matchesKeywordConflictError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { message?: string; code?: string; details?: string };

  if (candidate.code === "23505" || candidate.code === "23514" || candidate.code === "23P01") {
    return true;
  }

  if (typeof candidate.message === "string" && candidate.message.includes("NPC_KEYWORD_CONFLICT")) {
    return true;
  }

  if (typeof candidate.details === "string" && candidate.details.includes("npc_keyword_phrases")) {
    return true;
  }

  return false;
}

function matchesNpcNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { message?: string; code?: string };

  if (candidate.code === "P0002") {
    return true;
  }

  if (typeof candidate.message === "string") {
    return candidate.message.includes("NPC_NOT_FOUND");
  }

  return false;
}

function mapRpcKeywordRow(row: RawNpcKeywordRpcRow): NpcKeywordDto {
  return {
    id: row.id,
    response: row.response,
    sortIndex: row.sort_index,
    phrases: normalizeNpcKeywordPhrases(row.id, row.phrases),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } satisfies NpcKeywordDto;
}

function mapKeywordRow(row: RawNpcKeywordRow): NpcKeywordDto {
  return {
    id: row.id,
    response: row.response,
    sortIndex: row.sort_index,
    phrases: mapKeywordPhrases(row.npc_keyword_phrases),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } satisfies NpcKeywordDto;
}

function mapKeywordPhrases(rows: RawNpcKeywordPhraseRow[] | null): NpcKeywordDto["phrases"] {
  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }

  return rows
    .filter((row): row is RawNpcKeywordPhraseRow => Boolean(row) && row.deleted_at === null)
    .map(
      (row) =>
        ({
          id: row.id,
          phrase: row.phrase,
        }) satisfies NpcKeywordDto["phrases"][number]
    );
}

function normalizeNpcKeywordPhrases(_keywordId: string, value: unknown): NpcKeywordDto["phrases"] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const candidate = entry as { id?: unknown; phrase?: unknown };
      const id = typeof candidate.id === "string" ? candidate.id : null;
      const phrase = typeof candidate.phrase === "string" ? candidate.phrase : null;

      if (!id || !phrase) {
        return null;
      }

      return {
        id,
        phrase,
      } satisfies NpcKeywordDto["phrases"][number];
    })
    .filter((phrase): phrase is NpcKeywordDto["phrases"][number] => phrase !== null);
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

function isPublishConflictError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { code?: string; message?: string; details?: string };

  if (typeof candidate.code === "string" && ["23514", "23502", "23505"].includes(candidate.code)) {
    return true;
  }

  if (typeof candidate.message === "string" && candidate.message.toLowerCase().includes("constraint")) {
    return true;
  }

  if (typeof candidate.details === "string" && candidate.details.toLowerCase().includes("constraint")) {
    return true;
  }

  return false;
}
