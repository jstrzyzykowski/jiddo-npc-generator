import type { SupabaseClient } from "../../db/supabase.client";
import type { Database } from "../../db/database.types";
import type { ProfileNpcCountsDto, GetProfileMeResponseDto } from "@/types/profile";

const PROFILE_SELECT_COLUMNS = "id, display_name, created_at, updated_at" as const;
const LOG_PREFIX = "profileService";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type NpcRow = Database["public"]["Tables"]["npcs"]["Row"];

type ProfileSummary = Pick<ProfileRow, "id" | "display_name" | "created_at" | "updated_at">;
type NpcStatus = NpcRow["status"];

export type ProfileServiceErrorCode =
  | "PROFILE_NOT_FOUND"
  | "PROFILE_FETCH_FAILED"
  | "NPC_COUNTS_FETCH_FAILED"
  | "PROFILE_ACCESS_FORBIDDEN"
  | "NPC_COUNTS_ACCESS_FORBIDDEN";

export class ProfileServiceError extends Error {
  constructor(
    public readonly code: ProfileServiceErrorCode,
    options?: { cause?: unknown }
  ) {
    super(`[${LOG_PREFIX}] ${code}`, options);
    this.name = "ProfileServiceError";
  }
}

export async function getProfileWithNpcCounts(
  supabase: SupabaseClient,
  userId: string
): Promise<GetProfileMeResponseDto> {
  if (!userId) {
    throw new ProfileServiceError("PROFILE_FETCH_FAILED", {
      cause: new Error("Missing user identifier"),
    });
  }

  const profile = await fetchProfile(supabase, userId);
  if (!profile) {
    throw new ProfileServiceError("PROFILE_NOT_FOUND");
  }

  const npcCounts = await fetchNpcStatusCounts(supabase, userId);

  return {
    id: profile.id,
    displayName: profile.display_name,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
    npcCounts,
  } satisfies GetProfileMeResponseDto;
}

export async function updateProfileDisplayName(
  supabase: SupabaseClient,
  userId: string,
  displayName: string
): Promise<GetProfileMeResponseDto> {
  if (!userId) {
    throw new ProfileServiceError("PROFILE_FETCH_FAILED", {
      cause: new Error("Missing user identifier"),
    });
  }

  const trimmed = displayName.trim();
  if (trimmed.length === 0) {
    throw new ProfileServiceError("PROFILE_FETCH_FAILED", {
      cause: new Error("Display name is required"),
    });
  }

  const { error } = await supabase.from("profiles").update({ display_name: trimmed }).eq("id", userId);

  if (error) {
    console.error(`${LOG_PREFIX}: updateProfileDisplayName`, error);

    if (isForbiddenSupabaseError(error)) {
      throw new ProfileServiceError("PROFILE_ACCESS_FORBIDDEN", { cause: error });
    }

    throw new ProfileServiceError("PROFILE_FETCH_FAILED", { cause: error });
  }

  return getProfileWithNpcCounts(supabase, userId);
}

async function fetchProfile(supabase: SupabaseClient, userId: string): Promise<ProfileSummary | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select<typeof PROFILE_SELECT_COLUMNS, ProfileSummary>(PROFILE_SELECT_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error(`${LOG_PREFIX}: fetchProfile`, error);

    if (isForbiddenSupabaseError(error)) {
      throw new ProfileServiceError("PROFILE_ACCESS_FORBIDDEN", { cause: error });
    }

    throw new ProfileServiceError("PROFILE_FETCH_FAILED", { cause: error });
  }

  return data ?? null;
}

async function fetchNpcStatusCounts(supabase: SupabaseClient, userId: string): Promise<ProfileNpcCountsDto> {
  const statuses = ["draft", "published"] as const;
  const counts: ProfileNpcCountsDto = {
    draft: 0,
    published: 0,
  };

  for (const status of statuses) {
    const { count, error } = await supabase
      .from("npcs")
      .select("status", { count: "exact", head: true })
      .eq("owner_id", userId)
      .is("deleted_at", null)
      .eq("status", status satisfies NpcStatus);

    if (error) {
      console.error(`${LOG_PREFIX}: fetchNpcStatusCounts`, error);

      if (isForbiddenSupabaseError(error)) {
        throw new ProfileServiceError("NPC_COUNTS_ACCESS_FORBIDDEN", { cause: error });
      }

      throw new ProfileServiceError("NPC_COUNTS_FETCH_FAILED", { cause: error });
    }

    counts[status] = count ?? 0;
  }

  return counts;
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
