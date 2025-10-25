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
- **Description**: Return authenticated user profile and derived counts (e.g., NPC totals for draft and published statuses).
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
- **Error Codes**: `401 Unauthorized` (missing/invalid Supabase JWT), `403 Forbidden` (suspended user), `404 Not Found` (profile does not exist).

### 2.2 NPCs

#### 2.2.1 Create Draft NPC

- **Method**: `POST`
- **Path**: `/npcs`
- **Description**: Create an NPC draft owned by the caller. The operation is idempotent, ensured by the unique `clientRequestId`. This does not trigger AI generation.
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
- **Error Codes**: `400 Bad Request` (validation failure or duplicate `clientRequestId`), `401 Unauthorized`, `413 Payload Too Large` (Post-MVP), `429 Too Many Requests` (Post-MVP, for idempotency abuse).

#### 2.2.2 Trigger AI Generation

- **Method**: `POST`
- **Path**: `/npcs/{npcId}/generate`
- **Description**: Kicks off an asynchronous XML generation job using the latest NPC parameters. Returns a `jobId` for polling.
- **Query Params**: optional `force=true` to bypass cached XML or re-run a failed job.
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
- **Error Codes**: `400 Bad Request` (invalid request body), `401 Unauthorized`, `404 Not Found` (NPC with the given ID does not exist or user is not the owner), `409 Conflict` (a generation job for this NPC is already in progress).

#### 2.2.3 Generation Job Status

- **Method**: `GET`
- **Path**: `/npcs/{npcId}/generation-jobs/{jobId}`
- **Description**: Poll job status; returns generated XML when completed. **MVP Mock Implementation**: This endpoint simulates job progress. After a short, artificial delay (e.g., 3 seconds), it will transition the job status to `succeeded` and return the content of a static mock file.
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
- **Error Codes**: `401 Unauthorized`, `404 Not Found` (NPC or Job not found, or user is not the owner).

#### 2.2.4 Get NPC List (Public + Owner Views)

- **Method**: `GET`
- **Path**: `/npcs`
- **Description**: List NPCs with pagination and filtering; defaults to public, published records.
- **Query Params**:
  - `visibility=public|mine|all` (default `public`, requires auth for `mine` and `all`)
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
- **Error Codes**: `400 Bad Request` (invalid filters), `401 Unauthorized` (for `mine`/`all`).

#### 2.2.5 Get Featured NPCs

- **Method**: `GET`
- **Path**: `/npcs/featured`
- **Description**: Return a list of the most recently published NPCs for the homepage.
- **Query Params**: optional `limit` (integer, 1-10, default 10).
- **Response JSON**: An object with an `items` key, containing an array of `NpcListItemDto` objects (same shape as in the NPC list endpoint).
- **Success Codes**: `200 OK`
- **Error Codes**: `400 Bad Request` (invalid `limit`), `500 Internal Server Error`.

#### 2.2.6 Get NPC Detail

- **Method**: `GET`
- **Path**: `/npcs/{npcId}`
- **Description**: Fetch full NPC details, including generated XML/Lua previews and all module data.
- **Query Params**: `includeDraft=true` (owner only) is not used, as access is controlled by RLS policies. An authenticated owner will always see their draft.
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
- **Error Codes**: `401 Unauthorized`, `404 Not Found` (NPC not found or user is not the owner).

#### 2.2.7 Update NPC

- **Method**: `PATCH`
- **Path**: `/npcs/{npcId}`
- **Description**: Partial update of an NPC's attributes. Can only be performed by the owner.
- **Request JSON**: A subset of the create payload. All fields are optional.
- **Response JSON**: The updated resource summary, matching the `NpcListItemDto` shape.
- **Success Codes**: `200 OK`
- **Error Codes**: `400 Bad Request`, `401 Unauthorized`, `404 Not Found` (NPC not found or user is not the owner), `422 Unprocessable Entity` (validation failure, e.g., `healthNow > healthMax`).

#### 2.2.8 Publish NPC

- **Method**: `POST`
- **Path**: `/npcs/{npcId}/publish`
- **Description**: Runs publication checks, sets the NPC status to `published`, and records a telemetry event.
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
- **Error Codes**: `400 Bad Request` (missing confirmation), `401 Unauthorized`, `404 Not Found` (NPC not found or user is not the owner), `409 Conflict` (already published), `422 Unprocessable Entity` (failed integrity checks).

#### 2.2.9 Soft Delete NPC

- **Method**: `DELETE`
- **Path**: `/npcs/{npcId}`
- **Description**: Soft-deletes an NPC and its related modules. The operation is idempotent.
- **Query Params**: optional `reason=string` for audit trail purposes.
- **Response JSON**:

```
{
  "id": "uuid",
  "deletedAt": "ISO-8601"
}
```

- **Success Codes**: `200 OK`
- **Error Codes**: `401 Unauthorized`, `404 Not Found` (NPC not found or user is not the owner), `409 Conflict` (already deleted).

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
- **Error Codes**: `401 Unauthorized`, `403 Forbidden`, `404 Not Found`.

#### 2.3.2 Create Shop Item

- **Method**: `POST`
- **Path**: `/npcs/{npcId}/shop-items`
- **Description**: Add a new buy/sell item to an NPC's shop inventory.
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
- **Error Codes**: `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `409 Conflict` (limit exceeded), `422 Unprocessable Entity`.

#### 2.3.3 Bulk Replace Shop Items

- **Method**: `PUT`
- **Path**: `/npcs/{npcId}/shop-items`
- **Description**: Replaces the entire collection of shop items in a single transaction.
- **Request JSON**:

```
{
  "items": [ { ...same as create... } ]
}
```

- **Response JSON**: list of stored items.
- **Success Codes**: `200 OK`
- **Error Codes**: `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `409 Conflict` (limit exceeded), `422 Unprocessable Entity`.

#### 2.3.4 Update Shop Item (Post-MVP)

- **Method**: `PATCH`
- **Path**: `/npcs/{npcId}/shop-items/{itemId}`
- **Description**: Partial update for an individual shop item's properties.
- **Request JSON**: subset of create payload.
- **Response JSON**: updated item.
- **Success Codes**: `200 OK`
- **Error Codes**: `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`.

#### 2.3.5 Soft Delete Shop Item (Post-MVP)

- **Method**: `DELETE`
- **Path**: `/npcs/{npcId}/shop-items/{itemId}`
- **Description**: Mark a single shop item as deleted.
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
- **Description**: Retrieve keyword entries with nested phrases for an NPC.
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

#### 2.4.2 Bulk Replace Keywords

- **Method**: `PUT`
- **Path**: `/npcs/{npcId}/keywords`
- **Description**: Replaces the entire collection of keywords and their associated phrases for an NPC in a single atomic transaction.
- **Request JSON**:

```
{
  "items": [
    {
      "response": "string",
      "sortIndex": integer,
      "phrases": ["string", ...]
    }
  ]
}
```

- **Response JSON**: The newly created list of keywords, including generated IDs for keywords and phrases.
- **Success Codes**: `200 OK`
- **Error Codes**: `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `409 Conflict` (limit exceeded or phrase conflict), `422 Unprocessable Entity`.

#### 2.4.3 Create Keyword (Post-MVP)

- **Method**: `POST`
- **Path**: `/npcs/{npcId}/keywords`
- **Description**: Add a new keyword with optional initial phrases.
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
- **Error Codes**: `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `409 Conflict` (limit exceeded or reserved phrase), `422 Unprocessable Entity`.

#### 2.4.4 Update Keyword (Post-MVP)

- **Method**: `PATCH`
- **Path**: `/npcs/{npcId}/keywords/{keywordId}`
- **Description**: Update a keyword's response text, sort index, or associated phrases.
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
- **Error Codes**: `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`.
