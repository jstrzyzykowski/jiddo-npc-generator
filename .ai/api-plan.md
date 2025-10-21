# REST API Plan

## 1. Resources

- `profiles` → `profiles` table; authenticated user metadata and ownership reference for NPCs.
- `npcs` → `npcs` table; core NPC definition, status lifecycle, publication metadata, size tracking.
- `npc_shop_items` → `npc_shop_items` table; buy/sell inventory scoped to an NPC.
- `npc_keywords` → `npc_keywords` table; NPC keyword responses with ordering and soft delete.
- `npc_keyword_phrases` → `npc_keyword_phrases` table; trigger phrases linked to keywords, enforcing NPC-level uniqueness.
- `telemetry` (internal) → `telemetry_events` table; service-role analytics for create/publish flows.
- `generation-jobs` (virtual) → orchestrates AI XML generation lifecycle (stores in `npcs` metadata columns such as `content_size_bytes`, `status`, `updated_at`).

## 2. Endpoints

### 2.1 Profiles

- **Method**: `GET`
- **Path**: `/profiles/me`
- **Description**: Return authenticated user profile and derived counts (e.g., NPC totals).
- **Query Params**: none.
- **Request JSON**: `n/a`
- **Response JSON**:

```
{
  "id": "uuid",
  "displayName": "string",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601",
  "npcCounts": {
    "draft": number,
    "published": number
  }
}
```

- **Success Codes**: `200 OK`
- **Error Codes**: `401 Unauthorized` (missing/invalid Supabase JWT), `403 Forbidden` (suspended user).

### 2.2 NPCs

#### 2.2.1 Create Draft NPC

- **Method**: `POST`
- **Path**: `/npcs`
- **Description**: Create NPC draft owned by caller; does not trigger AI generation.
- **Query Params**: none.
- **Request JSON**:

```
{
  "clientRequestId": "uuid",
  "name": "string",
  "look": {
    "type": "player|monster|item",
    "typeId": integer|null,
    "itemId": integer|null,
    "head": integer|null,
    "body": integer|null,
    "legs": integer|null,
    "feet": integer|null,
    "addons": integer|null,
    "mount": integer|null
  },
  "stats": {
    "healthNow": integer,
    "healthMax": integer,
    "walkInterval": integer,
    "floorChange": boolean
  },
  "messages": {
    "greet": "string",
    "farewell": "string",
    "decline": "string",
    "noShop": "string",
    "onCloseShop": "string"
  },
  "modules": {
    "focusEnabled": boolean,
    "travelEnabled": boolean,
    "voiceEnabled": boolean,
    "shopEnabled": boolean,
    "shopMode": "trade_window|talk_mode",
    "keywordsEnabled": boolean
  },
  "contentSizeBytes": integer
}
```

- **Response JSON**:

```
{
  "id": "uuid",
  "status": "draft",
  "ownerId": "uuid",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```

- **Success Codes**: `201 Created`
- **Error Codes**: `400 Bad Request` (validation failure or duplicate `clientRequestId`), `401 Unauthorized`, `413 Payload Too Large`, `429 Too Many Requests` (idempotency abuse).

#### 2.2.2 Trigger AI Generation

- **Method**: `POST`
- **Path**: `/npcs/{npcId}/generate`
- **Description**: Kick off asynchronous XML generation using latest NPC parameters.
- **Query Params**: optional `force=true` to bypass cached XML when editing.
- **Request JSON**:

```
{
  "regenerate": boolean,
  "currentXml": "string|null"
}
```

- **Response JSON**:

```
{
  "jobId": "uuid",
  "status": "queued",
  "npcId": "uuid",
  "submittedAt": "ISO-8601"
}
```

- **Success Codes**: `202 Accepted`
- **Error Codes**: `400 Bad Request` (NPC missing required parameters), `401 Unauthorized`, `403 Forbidden` (not owner), `409 Conflict` (job already running), `413 Payload Too Large`, `422 Unprocessable Entity` (content >256KB), `429 Too Many Requests` (generation rate limit).

#### 2.2.3 Generation Job Status

- **Method**: `GET`
- **Path**: `/npcs/{npcId}/generation-jobs/{jobId}`
- **Description**: Poll job status; returns generated XML when completed.
- **Query Params**: none.
- **Response JSON**:

```
{
  "jobId": "uuid",
  "npcId": "uuid",
  "status": "queued|processing|succeeded|failed",
  "xml": "string|null",
  "contentSizeBytes": integer|null,
  "error": {
    "code": "AI_TIMEOUT|AI_INVALID_XML|LIMIT_EXCEEDED",
    "message": "string"
  }|null,
  "updatedAt": "ISO-8601"
}
```

- **Success Codes**: `200 OK`
- **Error Codes**: `401 Unauthorized`, `403 Forbidden`, `404 Not Found`.

#### 2.2.4 Get NPC List (Public + Owner Views)

- **Method**: `GET`
- **Path**: `/npcs`
- **Description**: List NPCs with pagination; defaults to public published records.
- **Query Params**:
  - `visibility=public|mine|all` (default `public`, requires auth for others)
  - `status=draft|published` (owner only)
  - `search=string` (matches `lower(name)`)
  - `shopEnabled=true|false`
  - `keywordsEnabled=true|false`
  - `limit` (default 20, max 100)
  - `cursor` (opaque for infinite scroll)
  - `sort=published_at|updated_at|created_at`
  - `order=asc|desc`
- **Response JSON**:

```
{
  "items": [
    {
      "id": "uuid",
      "name": "string",
      "owner": {
        "id": "uuid",
        "displayName": "string"
      },
      "status": "draft|published",
      "modules": {
        "shopEnabled": boolean,
        "keywordsEnabled": boolean
      },
      "publishedAt": "ISO-8601|null",
      "updatedAt": "ISO-8601",
      "contentSizeBytes": integer
    }
  ],
  "pageInfo": {
    "nextCursor": "string|null",
    "total": integer|null
  }
}
```

- **Success Codes**: `200 OK`
- **Error Codes**: `400 Bad Request` (invalid filters), `401 Unauthorized` (for `mine/all`), `429 Too Many Requests` (pagination abuse).

#### 2.2.5 Get Featured NPCs

- **Method**: `GET`
- **Path**: `/npcs/featured`
- **Description**: Return latest 10 published NPCs for homepage.
- **Query Params**: optional `limit` (max 10).
- **Response JSON**: same item shape as list with capped array.
- **Success Codes**: `200 OK`
- **Error Codes**: `400 Bad Request`, `429 Too Many Requests`.

#### 2.2.6 Get NPC Detail

- **Method**: `GET`
- **Path**: `/npcs/{npcId}`
- **Description**: Fetch NPC detail; includes XML/Lua previews and module data.
- **Query Params**: `includeDraft=true` (owner only) to view draft state for published NPC.
- **Response JSON**:

```
{
  "id": "uuid",
  "name": "string",
  "status": "draft|published",
  "system": "string",
  "implementationType": "xml",
  "script": "default.lua",
  "look": { ... },
  "stats": { ... },
  "messages": { ... },
  "modules": { ... },
  "xml": "string",
  "lua": "string",
  "contentSizeBytes": integer,
  "publishedAt": "ISO-8601|null",
  "firstPublishedAt": "ISO-8601|null",
  "deletedAt": "ISO-8601|null",
  "owner": { "id": "uuid", "displayName": "string" }
}
```

- **Success Codes**: `200 OK`
- **Error Codes**: `401 Unauthorized` (draft without ownership), `403 Forbidden` (non-owner requesting draft), `404 Not Found`.

#### 2.2.7 Update NPC

- **Method**: `PATCH`
- **Path**: `/npcs/{npcId}`
- **Description**: Partial update of NPC attributes; enforces locked `ownerId`.
- **Request JSON**: same shape as create but all fields optional; may include `shopEnabled`, `keywordsEnabled`, `contentSizeBytes`, `voiceEnabled`, etc.
- **Response JSON**: updated resource summary (same as detail but without heavy fields by default).
- **Success Codes**: `200 OK`
- **Error Codes**: `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `409 Conflict` (attempt to change `ownerId`), `413 Payload Too Large`, `422 Unprocessable Entity` (validation failure).

#### 2.2.8 Publish NPC

- **Method**: `POST`
- **Path**: `/npcs/{npcId}/publish`
- **Description**: Run publication checks and set status to `published`; records telemetry.
- **Request JSON**:

```
{
  "confirmed": true
}
```

- **Response JSON**:

```
{
  "id": "uuid",
  "status": "published",
  "publishedAt": "ISO-8601",
  "firstPublishedAt": "ISO-8601"
}
```

- **Success Codes**: `200 OK`
- **Error Codes**: `400 Bad Request` (missing confirmation), `401 Unauthorized`, `403 Forbidden`, `409 Conflict` (already published), `422 Unprocessable Entity` (failed integrity checks such as missing shop items).

#### 2.2.9 Soft Delete NPC

- **Method**: `DELETE`
- **Path**: `/npcs/{npcId}`
- **Description**: Soft delete NPC and cascade `deleted_at` to child modules.
- **Query Params**: optional `reason=string` (audit trail).
- **Response JSON**:

```
{
  "id": "uuid",
  "deletedAt": "ISO-8601"
}
```

- **Success Codes**: `200 OK`
- **Error Codes**: `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict` (already deleted).

### 2.3 NPC Shop Items

#### 2.3.1 List Shop Items

- **Method**: `GET`
- **Path**: `/npcs/{npcId}/shop-items`
- **Description**: List active shop items for an NPC, optionally filtered by list type.
- **Query Params**:
  - `listType=buy|sell`
  - `includeDeleted=true` (owner only)
- **Response JSON**:

```
{
  "items": [
    {
      "id": "uuid",
      "listType": "buy|sell",
      "name": "string",
      "itemId": integer,
      "price": integer,
      "subtype": integer,
      "charges": integer,
      "realName": "string|null",
      "containerItemId": integer|null,
      "createdAt": "ISO-8601",
      "updatedAt": "ISO-8601"
    }
  ]
}
```

- **Success Codes**: `200 OK`
- **Error Codes**: `401 Unauthorized` (private NPC, non-owner), `403 Forbidden`, `404 Not Found` (NPC not accessible).

#### 2.3.2 Create Shop Item

- **Method**: `POST`
- **Path**: `/npcs/{npcId}/shop-items`
- **Description**: Add new buy/sell item; enforces ~255 limit.
- **Request JSON**:

```
{
  "listType": "buy|sell",
  "name": "string",
  "itemId": integer,
  "price": integer,
  "subtype": integer,
  "charges": integer,
  "realName": "string|null",
  "containerItemId": integer|null
}
```

- **Response JSON**: created item object with IDs/timestamps.
- **Success Codes**: `201 Created`
- **Error Codes**: `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `409 Conflict` (limit exceeded), `413 Payload Too Large`, `422 Unprocessable Entity` (invalid values).

#### 2.3.3 Bulk Replace Shop Items

- **Method**: `PUT`
- **Path**: `/npcs/{npcId}/shop-items`
- **Description**: Replace entire buy/sell collections in a single transaction to sync editor state.
- **Request JSON**:

```
{
  "items": [ { ...same as create... } ]
}
```

- **Response JSON**: list of stored items.
- **Success Codes**: `200 OK`
- **Error Codes**: `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `409 Conflict` (limit exceeded), `413 Payload Too Large`, `422 Unprocessable Entity`.

#### 2.3.4 Update Shop Item

- **Method**: `PATCH`
- **Path**: `/npcs/{npcId}/shop-items/{itemId}`
- **Description**: Partial update for item properties.
- **Request JSON**: subset of create payload.
- **Response JSON**: updated item.
- **Success Codes**: `200 OK`
- **Error Codes**: `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`.

#### 2.3.5 Soft Delete Shop Item

- **Method**: `DELETE`
- **Path**: `/npcs/{npcId}/shop-items/{itemId}`
- **Description**: Mark shop item as deleted.
- **Response JSON**:

```
{
  "id": "uuid",
  "deletedAt": "ISO-8601"
}
```

- **Success Codes**: `200 OK`
- **Error Codes**: `401 Unauthorized`, `403 Forbidden`, `404 Not Found`.

### 2.4 NPC Keywords

#### 2.4.1 List Keywords

- **Method**: `GET`
- **Path**: `/npcs/{npcId}/keywords`
- **Description**: Retrieve keyword entries with nested phrases.
- **Query Params**: `includeDeleted=true` (owner only), `limit`, `cursor` (for large sets).
- **Response JSON**:

```
{
  "items": [
    {
      "id": "uuid",
      "response": "string",
      "sortIndex": integer,
      "phrases": [
        { "id": "uuid", "phrase": "string" }
      ],
      "createdAt": "ISO-8601",
      "updatedAt": "ISO-8601"
    }
  ],
  "pageInfo": { "nextCursor": "string|null" }
}
```

- **Success Codes**: `200 OK`
- **Error Codes**: `401 Unauthorized`, `403 Forbidden`, `404 Not Found`.

#### 2.4.2 Create Keyword

- **Method**: `POST`
- **Path**: `/npcs/{npcId}/keywords`
- **Description**: Add new keyword with optional initial phrases.
- **Request JSON**:

```
{
  "response": "string",
  "phrases": ["string", ...],
  "sortIndex": integer
}
```

- **Response JSON**: keyword object with generated phrase IDs.
- **Success Codes**: `201 Created`
- **Error Codes**: `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `409 Conflict` (limit exceeded or reserved phrase), `413 Payload Too Large`, `422 Unprocessable Entity`.

#### 2.4.3 Update Keyword

- **Method**: `PATCH`
- **Path**: `/npcs/{npcId}/keywords/{keywordId}`
- **Description**: Update response text or sort index; optional phrase diff array.
- **Request JSON**:

```
{
  "response": "string",
  "sortIndex": integer,
  "phrases": {
    "add": ["string"],
    "remove": ["uuid"]
  }
}
```

- **Response JSON**: updated keyword with phrase lists.
- **Success Codes**: `200 OK`
- **Error Codes**: `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`, `413 Payload Too Large`, `422 Unprocessable Entity`.

#### 2.4.4 Delete Keyword

- **Method**: `DELETE`
- **Path**: `/npcs/{npcId}/keywords/{keywordId}`
- **Description**: Soft delete keyword and its phrases.
- **Response JSON**: `{ "id": "uuid", "deletedAt": "ISO-8601" }`
- **Success Codes**: `200 OK`
- **Error Codes**: `401 Unauthorized`, `403 Forbidden`, `404 Not Found`.

#### 2.4.5 Manage Keyword Phrases

- **Method**: `POST`
- **Path**: `/npc-keywords/{keywordId}/phrases`
- **Description**: Add phrase to existing keyword (owner only).
- **Request JSON**: `{ "phrase": "string" }`
- **Response JSON**: `{ "id": "uuid", "phrase": "string" }`
- **Success Codes**: `201 Created`
- **Error Codes**: `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`, `413 Payload Too Large`, `422 Unprocessable Entity`.

- **Method**: `DELETE`
- **Path**: `/npc-keywords/{keywordId}/phrases/{phraseId}`
- **Description**: Soft delete phrase.
- **Response JSON**: `{ "id": "uuid", "deletedAt": "ISO-8601" }`
- **Success Codes**: `200 OK`
- **Error Codes**: `401 Unauthorized`, `403 Forbidden`, `404 Not Found`.

### 2.5 Telemetry (Service Role)

- **Method**: `POST`
- **Path**: `/telemetry/events`
- **Description**: Internal endpoint used by trusted services to record events (NPC Created/Published failures). Requires service key.
- **Request JSON**:

```
{
  "eventType": "NPC_CREATED|NPC_PUBLISHED|AI_ERROR|NPC_DELETED",
  "userId": "uuid|null",
  "npcId": "uuid|null",
  "metadata": { "string": any }
}
```

- **Response JSON**: `{ "id": "uuid", "createdAt": "ISO-8601" }`
- **Success Codes**: `202 Accepted`
- **Error Codes**: `401 Unauthorized`, `403 Forbidden`, `422 Unprocessable Entity`.

### 2.6 Health & Rate Limiting

- **Method**: `GET`
- **Path**: `/health`
- **Description**: Return service health for monitoring.
- **Response JSON**: `{ "status": "ok", "timestamp": "ISO-8601" }`
- **Success Codes**: `200 OK`
- **Error Codes**: `503 Service Unavailable`.

## 3. Authentication and Authorization

- Supabase Magic Link authentication handled client-side; API expects `Authorization: Bearer <supabase-access-token>` on protected routes. Tokens validated using Supabase JWKS.
- Role mapping:
  - **Authenticated user**: access to their `profiles` record, CRUD on owned `npcs`, nested modules, AI generation, publish/delete actions.
  - **Unauthenticated user**: read-only access to published NPC listings/details; denied access to drafts or private metadata.
  - **Service role**: uses Supabase service key for `/telemetry/events` and background jobs.
- Database leverages RLS policies mirroring API rules; API checks ownership before mutating resources and ensures `ownerId` immutability.
- Enforce rate limits per IP/token (e.g., 60 requests/min) with higher allowances for authenticated owners; stricter limits on `POST /npcs/{id}/generate` (5/min per NPC) to control AI cost.
- Require `clientRequestId` idempotency token header (`Idempotency-Key`) on `POST /npcs` to prevent duplicate drafts.

## 4. Validation and Business Logic

### 4.1 Cross-Cutting Validation

- Reject payloads with content fields exceeding 262144 bytes; return `413 Payload Too Large` before hitting DB triggers.
- Enforce JSON schema, types, and enum values (e.g., `npc_shop_mode`, `npc_status`).
- Normalize string comparisons to lower-case when checking uniqueness (names, phrases).
- Respect soft-delete semantics: standard queries exclude `deletedAt` unless explicitly requested.

### 4.2 NPC Validation & Logic

- Ensure `name` length 1–255, `script` equals `default.lua`, `walkInterval` 0–65535, `health` ranges, `contentSizeBytes` accurate.
- Conditional validations: look type fields required/nullable per type; reserved phrases blocked when `shopMode=talk_mode`.
- AI generation job stores XML + Lua preview; on success update `xml`, `contentSizeBytes`, `updatedAt`; on failure capture telemetry (`AI_ERROR`).
- Publish action validates shop/keyword completeness, `deletedAt` null, `status` transitions, and sets `firstPublishedAt` if null.
- Soft delete (`DELETE /npcs/{id}`) sets `deletedAt` and triggers cascade to shop items/keywords/phrases.
- Update endpoint prevents `ownerId` changes and respects RLS; editing published NPC prompts confirmation in UI but API requires `confirmed=true` flag on publish call only.

### 4.3 Shop Items Validation & Logic

- Enforce limit of 255 items per list (buy/sell) per NPC prior to insert/replace.
- Validate numeric fields (`itemId > 0`, `price >= 0`, `subtype >= 0`, `charges >= 0`).
- Ensure `containerItemId` positive when provided.
- Soft delete items by setting `deletedAt`; list endpoints filter by default.

### 4.4 Keywords & Phrases Validation & Logic

- Limit 255 keywords per NPC; each must have ≥1 phrase; phrases 1–64 chars.
- Phrase uniqueness enforced case-insensitively per NPC; API checks before insert/update.
- Reserved shop phrases (when `talk_mode`) rejected with `409 Conflict`.
- Keyword responses length 1–512; sorting uses `sortIndex` non-negative.
- Phrase management ensures cascaded soft delete when keyword removed.

### 4.5 Telemetry Logic

- Emit telemetry events server-side: `NPC_CREATED` after successful draft creation, `NPC_PUBLISHED` on publish success, `NPC_DELETED` when owner soft deletes an NPC (metadata may include `reason`), `AI_ERROR` on generation failure.
- Service-role endpoint validates payload size/type; RLS restricts reads/writes to service role.

### 4.6 Performance & Observability

- Utilize indexed queries via filters: `lower(name)` search, published partial index for public lists, `npc_id` indexes for child modules.
- Implement cursor-based pagination using `published_at` + `id` composite for stable infinite scroll.
- Cache featured NPCs for short TTL (e.g., 60s) to support homepage.
- Expose structured error codes/messages for UI handling (e.g., `LIMIT_EXCEEDED`, `RESERVED_PHRASE`).
