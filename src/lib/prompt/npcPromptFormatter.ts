import type { NpcDetailResponseDto } from "@/types/npc";

export interface PromptNpcModel {
  name?: string | null;

  look?: {
    type?: number | string | null;
    typeId?: number | null;
    itemId?: number | null;
    head?: number | null;
    body?: number | null;
    legs?: number | null;
    feet?: number | null;
    addons?: number | null;
    mount?: number | null;
  } | null;

  stats?: {
    healthNow?: number | null;
    healthMax?: number | null;
    walkInterval?: number | null;
    floorChange?: boolean | null;
  } | null;

  messages?: {
    greet?: string | null;
    farewell?: string | null;
    decline?: string | null;
    noShop?: string | null;
    onCloseShop?: string | null;
  } | null;

  modules?: {
    focusEnabled?: boolean | null;
    travelEnabled?: boolean | null;
    voiceEnabled?: boolean | null;
    shopEnabled?: boolean | null;
    shopMode?: string | null;
    keywordsEnabled?: boolean | null;
  } | null;
}

export function toPromptModel(npc: Partial<NpcDetailResponseDto>): PromptNpcModel {
  const safe = npc ?? ({} as Partial<NpcDetailResponseDto>);

  return {
    name: asOptionalString(safe.name),
    look: safe.look ?? null,
    stats: safe.stats ?? null,
    messages: safe.messages ?? null,
    modules: safe.modules ?? null,
  } satisfies PromptNpcModel;
}

export function formatNpcForPrompt(model: PromptNpcModel): string {
  const lines: string[] = [];

  lines.push("<generated_npc_data>");
  lines.push("");

  const basics: string[] = [];
  if (hasAny([model.name])) {
    basics.push("## Basic");
    if (model.name) basics.push(`- Name: ${inline(model.name)}`);
    lines.push(...basics, "");
  }

  if (model.look && hasAny(Object.values(model.look))) {
    const look = model.look;
    lines.push("## Look");
    if (look?.type !== undefined) lines.push(`- Type: ${inline(String(look?.type ?? ""))}`);
    if (look?.typeId !== undefined) lines.push(`- Type ID: ${look?.typeId ?? "-"}`);
    if (look?.itemId !== undefined) lines.push(`- Item ID: ${look?.itemId ?? "-"}`);
    if (look?.head !== undefined) lines.push(`- Head: ${look?.head ?? "-"}`);
    if (look?.body !== undefined) lines.push(`- Body: ${look?.body ?? "-"}`);
    if (look?.legs !== undefined) lines.push(`- Legs: ${look?.legs ?? "-"}`);
    if (look?.feet !== undefined) lines.push(`- Feet: ${look?.feet ?? "-"}`);
    if (look?.addons !== undefined) lines.push(`- Addons: ${look?.addons ?? "-"}`);
    if (look?.mount !== undefined) lines.push(`- Mount: ${look?.mount ?? "-"}`);
    lines.push("");
  }

  if (model.stats && hasAny(Object.values(model.stats))) {
    const stats = model.stats;
    lines.push("## Stats");
    if (stats?.healthNow !== undefined) lines.push(`- Health Now: ${stats?.healthNow ?? "-"}`);
    if (stats?.healthMax !== undefined) lines.push(`- Health Max: ${stats?.healthMax ?? "-"}`);
    if (stats?.walkInterval !== undefined) lines.push(`- Walk Interval: ${stats?.walkInterval ?? "-"}`);
    if (stats?.floorChange !== undefined) lines.push(`- Floor Change: ${boolText(stats?.floorChange)}`);
    lines.push("");
  }

  if (model.messages && hasAny(Object.values(model.messages))) {
    const m = model.messages;
    lines.push("## Messages");
    if (m?.greet) lines.push(`- greet: ${inline(m.greet)}`);
    if (m?.farewell) lines.push(`- farewell: ${inline(m.farewell)}`);
    if (m?.decline) lines.push(`- decline: ${inline(m.decline)}`);
    if (m?.noShop) lines.push(`- noShop: ${inline(m.noShop)}`);
    if (m?.onCloseShop) lines.push(`- onCloseShop: ${inline(m.onCloseShop)}`);
    lines.push("");
  }

  if (model.modules && hasAny(Object.values(model.modules))) {
    const mod = model.modules;
    lines.push("## Modules");
    if (mod?.focusEnabled !== undefined) lines.push(`- Focus: ${boolText(mod?.focusEnabled)}`);
    if (mod?.travelEnabled !== undefined) lines.push(`- Travel: ${boolText(mod?.travelEnabled)}`);
    if (mod?.voiceEnabled !== undefined) lines.push(`- Voice: ${boolText(mod?.voiceEnabled)}`);
    if (mod?.shopEnabled !== undefined) lines.push(`- Shop: ${boolText(mod?.shopEnabled)}`);
    if (mod?.shopMode !== undefined) lines.push(`- Shop Mode: ${inline(String(mod?.shopMode ?? ""))}`);
    if (mod?.keywordsEnabled !== undefined) lines.push(`- Keywords: ${boolText(mod?.keywordsEnabled)}`);
    lines.push("");
  }

  lines.push("</generated_npc_data>");

  return lines.join("\n");
}

export function formatNpcForPromptFromNpc(npc: Partial<NpcDetailResponseDto>): string {
  return formatNpcForPrompt(toPromptModel(npc));
}

function hasAny(values: unknown[]): boolean {
  return values.some((v) => v !== undefined && v !== null && !(typeof v === "string" && v.trim().length === 0));
}

function inline(value: string): string {
  if (!value) return "-";
  return value.replace(/`/g, "\u0060");
}

function boolText(value: boolean | null | undefined): string {
  return value ? "true" : "false";
}

function asOptionalString(value: unknown): string | null | undefined {
  if (typeof value === "string") return value;
  return value == null ? (value as null | undefined) : String(value);
}
