export interface PromptNpcModel {
  name?: string | null;
  look?: Record<string, unknown> | null;
  stats?: Record<string, unknown> | null;
  messages?: Record<string, unknown> | null;
  modules?: Record<string, unknown> | null;
}

export function toPromptModel(npc: Record<string, unknown>): PromptNpcModel {
  const safe = npc ?? {};
  return {
    name: asOptionalString(safe["name"]),
    look: (safe["look"] as Record<string, unknown> | null) ?? null,
    stats: (safe["stats"] as Record<string, unknown> | null) ?? null,
    messages: (safe["messages"] as Record<string, unknown> | null) ?? null,
    modules: (safe["modules"] as Record<string, unknown> | null) ?? null,
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
    const look = model.look as Record<string, unknown>;
    lines.push("## Look");
    if (look["type"] !== undefined) lines.push(`- Type: ${inline(String(look["type"]))}`);
    if (look["typeId"] !== undefined) lines.push(`- Type ID: ${String(look["typeId"])}`);
    if (look["itemId"] !== undefined) lines.push(`- Item ID: ${String(look["itemId"])}`);
    if (look["head"] !== undefined) lines.push(`- Head: ${String(look["head"])}`);
    if (look["body"] !== undefined) lines.push(`- Body: ${String(look["body"])}`);
    if (look["legs"] !== undefined) lines.push(`- Legs: ${String(look["legs"])}`);
    if (look["feet"] !== undefined) lines.push(`- Feet: ${String(look["feet"])}`);
    if (look["addons"] !== undefined) lines.push(`- Addons: ${String(look["addons"])}`);
    if (look["mount"] !== undefined) lines.push(`- Mount: ${String(look["mount"])}`);
    lines.push("");
  }

  if (model.stats && hasAny(Object.values(model.stats))) {
    const stats = model.stats as Record<string, unknown>;
    lines.push("## Stats");
    if (stats["healthNow"] !== undefined) lines.push(`- Health Now: ${String(stats["healthNow"])}`);
    if (stats["healthMax"] !== undefined) lines.push(`- Health Max: ${String(stats["healthMax"])}`);
    if (stats["walkInterval"] !== undefined) lines.push(`- Walk Interval: ${String(stats["walkInterval"])}`);
    if (stats["floorChange"] !== undefined) lines.push(`- Floor Change: ${String(stats["floorChange"])}`);
    lines.push("");
  }

  if (model.messages && hasAny(Object.values(model.messages))) {
    const m = model.messages as Record<string, unknown>;
    lines.push("## Messages");
    if (typeof m["greet"] === "string") lines.push(`- greet: ${inline(m["greet"] as string)}`);
    if (typeof m["farewell"] === "string") lines.push(`- farewell: ${inline(m["farewell"] as string)}`);
    if (typeof m["decline"] === "string") lines.push(`- decline: ${inline(m["decline"] as string)}`);
    if (typeof m["noShop"] === "string") lines.push(`- noShop: ${inline(m["noShop"] as string)}`);
    if (typeof m["onCloseShop"] === "string") lines.push(`- onCloseShop: ${inline(m["onCloseShop"] as string)}`);
    lines.push("");
  }

  if (model.modules && hasAny(Object.values(model.modules))) {
    const mod = model.modules as Record<string, unknown>;
    lines.push("## Modules");
    if (mod["focusEnabled"] !== undefined) lines.push(`- Focus: ${boolText(mod["focusEnabled"] as boolean)}`);
    if (mod["travelEnabled"] !== undefined) lines.push(`- Travel: ${boolText(mod["travelEnabled"] as boolean)}`);
    if (mod["voiceEnabled"] !== undefined) lines.push(`- Voice: ${boolText(mod["voiceEnabled"] as boolean)}`);
    if (mod["shopEnabled"] !== undefined) lines.push(`- Shop: ${boolText(mod["shopEnabled"] as boolean)}`);
    if (mod["shopMode"] !== undefined) lines.push(`- Shop Mode: ${inline(String(mod["shopMode"]))}`);
    if (mod["keywordsEnabled"] !== undefined) lines.push(`- Keywords: ${boolText(mod["keywordsEnabled"] as boolean)}`);
    lines.push("");
  }

  lines.push("</generated_npc_data>");

  return lines.join("\n");
}

export function formatNpcForPromptFromNpc(npc: Record<string, unknown>): string {
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
