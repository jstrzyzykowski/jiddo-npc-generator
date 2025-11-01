// Edge Function: generation-worker
// Orchestrates background generation job for NPC XML

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import { OpenRouterService, OpenRouterError } from "../../_shared/services/openRouterService.ts";

interface DbWebhookPayload {
  type: string;
  table: string;
  schema: string;
  record: Record<string, unknown> | null;
  old_record?: Record<string, unknown> | null;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getEnvOrThrow(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

const SUPABASE_URL = getEnvOrThrow("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = getEnvOrThrow("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function setJobStatus(
  npcId: string,
  status: "queued" | "processing" | "succeeded" | "failed",
  error: unknown = null,
  options: { suppressThrow?: boolean } = {}
) {
  const update: Record<string, unknown> = {
    generation_job_status: status,
  };
  if (status === "failed") update.generation_job_error = error ?? { message: "Unknown error" };
  if (status === "processing") update.generation_job_error = null;
  if (status === "succeeded") update.generation_job_error = null;

  const { error: dbError } = await supabase.from("npcs").update(update).eq("id", npcId);

  if (dbError) {
    console.error("Failed to update job status", dbError);
    if (!options.suppressThrow) {
      throw new Error(`Failed to update job status to ${status}: ${dbError.message}`);
    }
  }
}

async function fetchNpcDetails(npcId: string) {
  const { data, error } = await supabase.from("npcs").select("*").eq("id", npcId).single();

  if (error) throw new Error(`Failed to fetch npc details: ${error.message}`);
  return data as Record<string, unknown>;
}

async function saveXmlToStorage(npcId: string, xml: string) {
  const bytes = new TextEncoder().encode(xml);
  const { error } = await supabase.storage.from("npc-xml-files").upload(`${npcId}.xml`, bytes, {
    contentType: "application/xml",
    upsert: true,
  });
  if (error) throw new Error(`Failed to upload XML: ${error.message}`);
}

Deno.serve(async (req: Request) => {
  let payload: DbWebhookPayload;
  try {
    payload = (await req.json()) as DbWebhookPayload;
  } catch {
    return jsonResponse({ message: "Invalid JSON body" }, 400);
  }

  if (payload.table !== "npcs") {
    return jsonResponse({ message: "Ignoring non-npcs table" });
  }

  const record = payload.record ?? {};
  const oldRecord = payload.old_record ?? {};
  const npcId = String((record as Record<string, unknown>).id ?? "");
  const newStatus = String((record as Record<string, unknown>).generation_job_status ?? "");
  const oldStatus = String((oldRecord as Record<string, unknown>).generation_job_status ?? "");

  // Process only INSERT with queued or UPDATE transition to queued
  const shouldProcess =
    (payload.type === "INSERT" && newStatus === "queued") ||
    (payload.type === "UPDATE" && newStatus === "queued" && oldStatus !== "queued");

  if (!shouldProcess) {
    return jsonResponse({ message: "Condition not met, skipping" });
  }

  if (!npcId) return jsonResponse({ message: "Missing npc id" }, 400);

  try {
    await setJobStatus(npcId, "processing");

    const npcDetails = await fetchNpcDetails(npcId);

    const service = new OpenRouterService();
    const xml = await service.generateNpcXml(npcDetails);

    await saveXmlToStorage(npcId, xml);
    await setJobStatus(npcId, "succeeded");

    return jsonResponse({ message: "Generation succeeded", npcId });
  } catch (e) {
    const err = e as unknown;
    const details =
      err instanceof OpenRouterError
        ? {
            type: err.type,
            statusCode: err.statusCode ?? null,
            details: err.details ?? null,
            message: err.message,
          }
        : {
            type: "UnexpectedError",
            message: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined,
          };

    await setJobStatus(npcId, "failed", details, { suppressThrow: true });
    return jsonResponse({ message: "Generation failed", error: details }, 500);
  }
});
