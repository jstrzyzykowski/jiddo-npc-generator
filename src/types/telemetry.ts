import type { Tables } from "../db/database.types";

type TelemetryEventRow = Tables<"telemetry_events">;

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
