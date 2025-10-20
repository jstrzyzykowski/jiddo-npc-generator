// DTO and Command Model definitions derived from Supabase entities and API plan
import type { Tables, TablesInsert, TablesUpdate, Enums } from "./db/database.types";

type ProfileRow = Tables<"profiles">;
type NpcRow = Tables<"npcs">;
type NpcInsert = TablesInsert<"npcs">;
type NpcUpdate = TablesUpdate<"npcs">;
type NpcShopItemRow = Tables<"npc_shop_items">;
type NpcKeywordRow = Tables<"npc_keywords">;
type NpcKeywordPhraseRow = Tables<"npc_keyword_phrases">;
type TelemetryEventRow = Tables<"telemetry_events">;

type NpcStatus = Enums<"npc_status">;
type NpcShopItemListType = Enums<"npc_shop_item_list_type">;

type IsoDateString = NpcRow["created_at"];

// Simplify recursive partial to avoid union distribution across primitives
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

/**
 * Pagination metadata shared by cursor-based endpoints.
 * `total` is omitted when not supplied by the backend (e.g., keywords listing).
 */
export interface CursorPageInfo {
  nextCursor: string | null;
  total?: number | null;
}

export interface PaginationResponse<TItem> {
  items: TItem[];
  pageInfo: CursorPageInfo;
}

export interface NpcLookDto {
  type: NpcRow["look_type"];
  typeId: NpcRow["look_type_id"];
  itemId: NpcRow["look_item_id"];
  head: NpcRow["look_head"];
  body: NpcRow["look_body"];
  legs: NpcRow["look_legs"];
  feet: NpcRow["look_feet"];
  addons: NpcRow["look_addons"];
  mount: NpcRow["look_mount"];
}

export interface NpcStatsDto {
  healthNow: NpcRow["health_now"];
  healthMax: NpcRow["health_max"];
  walkInterval: NpcRow["walk_interval"];
  floorChange: NpcRow["floor_change"];
}

export interface NpcMessagesDto {
  greet: NpcRow["greet_message"];
  farewell: NpcRow["farewell_message"];
  decline: NpcRow["decline_message"];
  noShop: NpcRow["no_shop_message"];
  onCloseShop: NpcRow["on_close_shop_message"];
}

export interface NpcModulesDto {
  focusEnabled: NpcRow["focus_enabled"];
  travelEnabled: NpcRow["travel_enabled"];
  voiceEnabled: NpcRow["voice_enabled"];
  shopEnabled: NpcRow["shop_enabled"];
  shopMode: NpcRow["shop_mode"];
  keywordsEnabled: NpcRow["keywords_enabled"];
}

interface NpcCommandBase {
  name: NpcRow["name"];
  look: NpcLookDto;
  stats: NpcStatsDto;
  messages: NpcMessagesDto;
  modules: NpcModulesDto;
  contentSizeBytes: NpcRow["content_size_bytes"];
}

export type CreateNpcCommand = {
  clientRequestId: NpcInsert["client_request_id"];
} & NpcCommandBase;

export type UpdateNpcCommand = DeepPartial<NpcCommandBase> & {
  clientRequestId?: NpcUpdate["client_request_id"];
};

export interface CreateNpcResponseDto {
  id: NpcRow["id"];
  status: Extract<NpcStatus, "draft">;
  ownerId: NpcRow["owner_id"];
  createdAt: NpcRow["created_at"];
  updatedAt: NpcRow["updated_at"];
}

export interface TriggerNpcGenerationCommand {
  regenerate: boolean;
  currentXml: string | null;
}

export interface TriggerNpcGenerationQueryDto {
  force?: boolean;
}

export type GenerationJobQueueStatus = "queued";

export interface TriggerNpcGenerationResponseDto {
  jobId: string;
  status: GenerationJobQueueStatus;
  npcId: NpcRow["id"];
  submittedAt: IsoDateString;
}

export type GenerationJobStatus = "queued" | "processing" | "succeeded" | "failed";

export type GenerationJobErrorCode = "AI_TIMEOUT" | "AI_INVALID_XML" | "LIMIT_EXCEEDED";

export interface GenerationJobErrorDto {
  code: GenerationJobErrorCode;
  message: string;
}

export interface GenerationJobStatusResponseDto {
  jobId: string;
  npcId: NpcRow["id"];
  status: GenerationJobStatus;
  xml: string | null;
  contentSizeBytes: NpcRow["content_size_bytes"] | null;
  error: GenerationJobErrorDto | null;
  updatedAt: IsoDateString;
}

export type NpcListVisibilityFilter = "public" | "mine" | "all";

export interface GetNpcListQueryDto {
  visibility?: NpcListVisibilityFilter;
  status?: NpcStatus;
  search?: string;
  shopEnabled?: boolean;
  keywordsEnabled?: boolean;
  limit?: number;
  cursor?: string;
  sort?: "published_at" | "updated_at" | "created_at";
  order?: "asc" | "desc";
}

export interface NpcOwnerSummaryDto {
  id: ProfileRow["id"];
  displayName: ProfileRow["display_name"];
}

export type NpcListModulesDto = Pick<NpcModulesDto, "shopEnabled" | "keywordsEnabled">;

export interface NpcListItemDto {
  id: NpcRow["id"];
  name: NpcRow["name"];
  owner: NpcOwnerSummaryDto;
  status: NpcRow["status"];
  modules: NpcListModulesDto;
  publishedAt: NpcRow["published_at"];
  updatedAt: NpcRow["updated_at"];
  contentSizeBytes: NpcRow["content_size_bytes"];
}

export type GetNpcListResponseDto = PaginationResponse<NpcListItemDto>;

export interface GetFeaturedNpcsResponseDto {
  items: NpcListItemDto[];
}

export interface GetFeaturedNpcsQueryDto {
  limit?: number;
}

export interface NpcDetailResponseDto {
  id: NpcRow["id"];
  name: NpcRow["name"];
  status: NpcRow["status"];
  system: NpcRow["system"];
  implementationType: NpcRow["implementation_type"];
  script: NpcRow["script"];
  look: NpcLookDto;
  stats: NpcStatsDto;
  messages: NpcMessagesDto;
  modules: NpcModulesDto;
  xml: string;
  lua: NpcRow["script"];
  contentSizeBytes: NpcRow["content_size_bytes"];
  publishedAt: NpcRow["published_at"];
  firstPublishedAt: NpcRow["first_published_at"];
  deletedAt: NpcRow["deleted_at"];
  owner: NpcOwnerSummaryDto;
}

export interface GetNpcDetailQueryDto {
  includeDraft?: boolean;
}

export type UpdateNpcResponseDto = NpcListItemDto;

export interface PublishNpcCommand {
  confirmed: true;
}

export interface PublishNpcResponseDto {
  id: NpcRow["id"];
  status: Extract<NpcStatus, "published">;
  publishedAt: NonNullable<NpcRow["published_at"]>;
  firstPublishedAt: NpcRow["first_published_at"];
}

export interface DeleteNpcResponseDto {
  id: NpcRow["id"];
  deletedAt: NonNullable<NpcRow["deleted_at"]>;
}

export interface DeleteNpcQueryDto {
  reason?: string;
}

export interface GetNpcShopItemsQueryDto {
  listType?: NpcShopItemListType;
  includeDeleted?: boolean;
}

export interface NpcShopItemDto {
  id: NpcShopItemRow["id"];
  listType: NpcShopItemRow["list_type"];
  name: NpcShopItemRow["name"];
  itemId: NpcShopItemRow["item_id"];
  price: NpcShopItemRow["price"];
  subtype: NpcShopItemRow["subtype"];
  charges: NpcShopItemRow["charges"];
  realName: NpcShopItemRow["real_name"];
  containerItemId: NpcShopItemRow["container_item_id"];
  createdAt: NpcShopItemRow["created_at"];
  updatedAt: NpcShopItemRow["updated_at"];
}

export interface GetNpcShopItemsResponseDto {
  items: NpcShopItemDto[];
}

export interface CreateNpcShopItemCommand {
  listType: NpcShopItemRow["list_type"];
  name: NpcShopItemRow["name"];
  itemId: NpcShopItemRow["item_id"];
  price: NpcShopItemRow["price"];
  subtype: NpcShopItemRow["subtype"];
  charges: NpcShopItemRow["charges"];
  realName: NpcShopItemRow["real_name"];
  containerItemId: NpcShopItemRow["container_item_id"];
}

export type CreateNpcShopItemResponseDto = NpcShopItemDto;

export interface BulkReplaceNpcShopItemsCommand {
  items: CreateNpcShopItemCommand[];
}

export interface BulkReplaceNpcShopItemsResponseDto {
  items: NpcShopItemDto[];
}

export type UpdateNpcShopItemCommand = Partial<CreateNpcShopItemCommand>;

export type UpdateNpcShopItemResponseDto = NpcShopItemDto;

export interface DeleteNpcShopItemResponseDto {
  id: NpcShopItemRow["id"];
  deletedAt: NonNullable<NpcShopItemRow["deleted_at"]>;
}

export interface GetNpcKeywordsQueryDto {
  includeDeleted?: boolean;
  limit?: number;
  cursor?: string;
}

export interface NpcKeywordPhraseDto {
  id: NpcKeywordPhraseRow["id"];
  phrase: NpcKeywordPhraseRow["phrase"];
}

export interface NpcKeywordDto {
  id: NpcKeywordRow["id"];
  response: NpcKeywordRow["response"];
  sortIndex: NpcKeywordRow["sort_index"];
  phrases: NpcKeywordPhraseDto[];
  createdAt: NpcKeywordRow["created_at"];
  updatedAt: NpcKeywordRow["updated_at"];
}

export type GetNpcKeywordsResponseDto = PaginationResponse<NpcKeywordDto>;

export interface CreateNpcKeywordCommand {
  response: NpcKeywordRow["response"];
  phrases?: NpcKeywordPhraseRow["phrase"][];
  sortIndex: NpcKeywordRow["sort_index"];
}

export type CreateNpcKeywordResponseDto = NpcKeywordDto;

export interface UpdateNpcKeywordCommand {
  response?: NpcKeywordRow["response"];
  sortIndex?: NpcKeywordRow["sort_index"];
  phrases?: {
    add?: NpcKeywordPhraseRow["phrase"][];
    remove?: NpcKeywordPhraseRow["id"][];
  };
}

export type UpdateNpcKeywordResponseDto = NpcKeywordDto;

export interface DeleteNpcKeywordResponseDto {
  id: NpcKeywordRow["id"];
  deletedAt: NonNullable<NpcKeywordRow["deleted_at"]>;
}

export interface AddNpcKeywordPhraseCommand {
  phrase: NpcKeywordPhraseRow["phrase"];
}

export type AddNpcKeywordPhraseResponseDto = NpcKeywordPhraseDto;

export interface DeleteNpcKeywordPhraseResponseDto {
  id: NpcKeywordPhraseRow["id"];
  deletedAt: NonNullable<NpcKeywordPhraseRow["deleted_at"]>;
}

export type TelemetryEventType = "NPC_CREATED" | "NPC_PUBLISHED" | "AI_ERROR" | "NPC_DELETED";

export interface CreateTelemetryEventCommand {
  eventType: TelemetryEventType;
  userId: TelemetryEventRow["user_id"];
  npcId: TelemetryEventRow["npc_id"];
  metadata?: TelemetryEventRow["metadata"];
}

export interface CreateTelemetryEventResponseDto {
  id: TelemetryEventRow["id"];
  createdAt: TelemetryEventRow["created_at"];
}

export interface HealthResponseDto {
  status: "ok";
  timestamp: IsoDateString;
}

export interface ProfileNpcCountsDto {
  draft: number;
  published: number;
}

export interface GetProfileMeResponseDto {
  id: ProfileRow["id"];
  displayName: ProfileRow["display_name"];
  createdAt: ProfileRow["created_at"];
  updatedAt: ProfileRow["updated_at"];
  npcCounts: ProfileNpcCountsDto;
}
