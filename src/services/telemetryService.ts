import type { SupabaseClient } from "@/db/supabase.client";
import type { Database } from "@/db/database.types";
import type { CreateTelemetryEventCommand, CreateTelemetryEventResponseDto } from "@/types/telemetry";

const SERVICE_NAME = "telemetryService";

type TelemetryInsert = Database["public"]["Tables"]["telemetry_events"]["Insert"];

export type TelemetryServiceErrorCode = "TELEMETRY_EVENT_INSERT_FAILED" | "TELEMETRY_EVENT_ACCESS_FORBIDDEN";

export class TelemetryServiceError extends Error {
  constructor(
    public readonly code: TelemetryServiceErrorCode,
    options?: { cause?: unknown }
  ) {
    super(`[${SERVICE_NAME}] ${code}`, options);
    this.name = "TelemetryServiceError";
  }
}

export interface CreateTelemetryEventOptions {
  supabase: SupabaseClient;
  event: CreateTelemetryEventCommand;
}

export async function createEvent({
  supabase,
  event,
}: CreateTelemetryEventOptions): Promise<CreateTelemetryEventResponseDto> {
  if (!supabase) {
    throw new TelemetryServiceError("TELEMETRY_EVENT_INSERT_FAILED", {
      cause: new Error("Supabase client is not configured"),
    });
  }

  const payload: TelemetryInsert = {
    event_type: event.eventType,
    user_id: event.userId ?? null,
    npc_id: event.npcId ?? null,
    metadata: event.metadata ?? null,
  } satisfies TelemetryInsert;

  const { data, error } = await supabase.from("telemetry_events").insert(payload).select("id, created_at").single();

  if (error) {
    if (isForbiddenSupabaseError(error)) {
      throw new TelemetryServiceError("TELEMETRY_EVENT_ACCESS_FORBIDDEN", { cause: error });
    }

    console.error(`${SERVICE_NAME}.createEvent insert`, error);
    throw new TelemetryServiceError("TELEMETRY_EVENT_INSERT_FAILED", { cause: error });
  }

  if (!data) {
    throw new TelemetryServiceError("TELEMETRY_EVENT_INSERT_FAILED", {
      cause: new Error("Telemetry insert returned no data"),
    });
  }

  return {
    id: data.id,
    createdAt: data.created_at,
  } satisfies CreateTelemetryEventResponseDto;
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
