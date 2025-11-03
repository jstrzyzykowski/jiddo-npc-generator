import type { Tables } from "../db/database.types";

type ProfileRow = Tables<"profiles">;

export interface NpcOwnerSummaryDto {
  id: ProfileRow["id"];
  displayName: ProfileRow["display_name"];
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
