import type { IsoDateString } from "./npc";

export interface HealthResponseDto {
  status: "ok";
  timestamp: IsoDateString;
}
