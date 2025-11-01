import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import defaultLuaTemplate from "@/assets/lua/default.lua?raw";
import sampleNpcXml from "@/assets/mocks/sample-npc.xml?raw";
import {
  type BulkReplaceNpcKeywordsCommandInput,
  type BulkReplaceNpcShopItemsCommandInput,
  type CreateNpcCommandInput,
  type CreatorFormData,
  CreatorFormSchema,
  type CreatorKeywordFormData,
  type CreatorShopItemFormData,
  type UpdateNpcCommandInput,
} from "@/lib/validators/npcValidators";
import type {
  CreateNpcResponseDto,
  GenerationJobStatusResponseDto,
  NpcDetailResponseDto,
  NpcKeywordDto,
  NpcLookDto,
  NpcShopItemDto,
  TriggerNpcGenerationResponseDto,
} from "@/types";

type CreatorMode = "create" | "edit";

export interface CreatorGenerationState {
  status: "idle" | "queued" | "processing" | "succeeded" | "failed";
  jobId: string | null;
  xml: string | null;
  error: string | null;
  contentSizeBytes: number | null;
  updatedAt: string | null;
}

export interface CreatorCodeState {
  xml: string;
  lua: string;
  isLoading: boolean;
  contentSizeBytes: number | null;
  lastUpdatedAt: string | null;
}

export interface UseNpcCreatorResult {
  npcId?: string;
  mode: CreatorMode;
  form: UseFormReturn<CreatorFormData>;
  isLoading: boolean;
  error: string | null;
  code: CreatorCodeState;
  generationState: CreatorGenerationState;
  shouldPollGeneration: boolean;
  handleSaveDraft: (data: CreatorFormData) => Promise<void>;
  handleSaveChanges: (data: CreatorFormData) => Promise<void>;
  handleGenerate: (data: CreatorFormData) => Promise<void>;
  handleGenerationPollingSuccess: (payload: GenerationJobStatusResponseDto) => void;
  handleGenerationPollingError: (error: unknown) => void;
  reload: () => void;
}

const JSON_HEADERS: HeadersInit = {
  Accept: "application/json",
  "Content-Type": "application/json",
};

const GET_HEADERS: HeadersInit = {
  Accept: "application/json",
};

const DEFAULT_STATS = {
  healthNow: 100,
  healthMax: 100,
  walkInterval: 2_000,
  floorChange: false,
} as const;

const DEFAULT_MESSAGES = {
  greet: "Hello there!",
  farewell: "Farewell!",
  decline: "I can't help with that right now.",
  noShop: "My shop is closed at the moment.",
  onCloseShop: "Thank you for your business!",
} as const;

const DEFAULT_FORM_VALUES: CreatorFormData = {
  name: "",
  look_type: 128,
  look_head: 0,
  look_body: 0,
  look_legs: 0,
  look_feet: 0,
  look_addons: 0,
  is_shop_active: false,
  is_keywords_active: false,
  shop_items: [],
  keywords: [],
};

const INITIAL_GENERATION_STATE: CreatorGenerationState = {
  status: "idle",
  jobId: null,
  xml: null,
  error: null,
  contentSizeBytes: null,
  updatedAt: null,
};

const DEFAULT_CODE_STATE: CreatorCodeState = {
  xml: sampleNpcXml ?? "",
  lua: defaultLuaTemplate ?? "",
  isLoading: false,
  contentSizeBytes: null,
  lastUpdatedAt: null,
};

const POLLABLE_STATUSES = new Set<CreatorGenerationState["status"]>(["queued", "processing"]);

const FAKE_CREATE_LOADING_DELAY_MS = 600;

class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export function useNpcCreator(npcId?: string): UseNpcCreatorResult {
  const mode: CreatorMode = npcId ? "edit" : "create";

  const form = useForm<CreatorFormData>({
    resolver: zodResolver(CreatorFormSchema),
    mode: "onChange",
    defaultValues: DEFAULT_FORM_VALUES,
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<CreatorCodeState>(() => ({
    ...DEFAULT_CODE_STATE,
    xml: mode === "create" ? DEFAULT_CODE_STATE.xml : "",
    isLoading: mode === "edit",
  }));
  const [generationState, setGenerationState] = useState<CreatorGenerationState>(INITIAL_GENERATION_STATE);

  const initialDataRef = useRef<CreatorFormData>(normalizeFormData(DEFAULT_FORM_VALUES));
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const subscription = form.watch((values, { name }) => {
      if (!name) {
        return;
      }

      if (name === "is_shop_active" && values.is_shop_active === false) {
        if ((values.shop_items ?? []).length > 0) {
          form.setValue("shop_items", [], { shouldDirty: true, shouldValidate: true });
        }
      }

      if (name === "is_keywords_active" && values.is_keywords_active === false) {
        if ((values.keywords ?? []).length > 0) {
          form.setValue("keywords", [], { shouldDirty: true, shouldValidate: true });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [form]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!form.formState.isDirty) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    if (form.formState.isDirty) {
      window.addEventListener("beforeunload", handleBeforeUnload);
      return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }

    return undefined;
  }, [form.formState.isDirty]);

  useEffect(() => {
    if (!npcId) {
      setError(null);
      setCode((prev) => ({
        ...prev,
        xml: DEFAULT_CODE_STATE.xml,
        lua: DEFAULT_CODE_STATE.lua,
        isLoading: false,
        contentSizeBytes: null,
        lastUpdatedAt: null,
      }));
      initialDataRef.current = normalizeFormData(DEFAULT_FORM_VALUES);
      form.reset(DEFAULT_FORM_VALUES, { keepErrors: false, keepDirty: false });
      setGenerationState(INITIAL_GENERATION_STATE);
      if (typeof window === "undefined") {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const timer = window.setTimeout(() => {
        setIsLoading(false);
      }, FAKE_CREATE_LOADING_DELAY_MS);

      return () => {
        window.clearTimeout(timer);
      };
    }

    let isActive = true;
    const controller = new AbortController();

    const load = async () => {
      setIsLoading(true);
      setError(null);
      setCode((prev) => ({ ...prev, isLoading: true }));

      try {
        const [details, shopItemsResponse, keywordsResponse] = await Promise.all([
          fetchJson<NpcDetailResponseDto>(
            `/api/npcs/${npcId}?includeDraft=true`,
            {
              method: "GET",
              headers: GET_HEADERS,
            },
            controller.signal
          ),
          fetchJson<{ items: NpcShopItemDto[] }>(
            `/api/npcs/${npcId}/shop-items`,
            {
              method: "GET",
              headers: GET_HEADERS,
            },
            controller.signal
          ).catch((error) => {
            if (isAbortError(error)) {
              throw error;
            }

            console.error("useNpcCreator.load shop-items", error);
            return { items: [] } satisfies { items: NpcShopItemDto[] };
          }),
          fetchJson<{ items: NpcKeywordDto[] }>(
            `/api/npcs/${npcId}/keywords`,
            {
              method: "GET",
              headers: GET_HEADERS,
            },
            controller.signal
          ).catch((error) => {
            if (isAbortError(error)) {
              throw error;
            }

            console.error("useNpcCreator.load keywords", error);
            return { items: [] } satisfies { items: NpcKeywordDto[] };
          }),
        ]);

        if (!isActive) {
          return;
        }

        const formData = mapNpcDetailToForm(details, shopItemsResponse.items, keywordsResponse.items);
        initialDataRef.current = formData;
        form.reset(formData, { keepDirty: false, keepErrors: false });

        setCode({
          xml: details.xml ?? DEFAULT_CODE_STATE.xml,
          lua: details.lua ?? DEFAULT_CODE_STATE.lua,
          isLoading: false,
          contentSizeBytes: details.contentSizeBytes ?? null,
          lastUpdatedAt: details.publishedAt ?? details.firstPublishedAt ?? null,
        });

        setGenerationState((prev) => ({
          ...prev,
          status: "idle",
          jobId: null,
          xml: details.xml ?? prev.xml,
          contentSizeBytes: details.contentSizeBytes ?? prev.contentSizeBytes,
          error: null,
          updatedAt: details.publishedAt ?? details.firstPublishedAt ?? prev.updatedAt,
        }));
      } catch (loadError) {
        if (isAbortError(loadError) || !isActive) {
          return;
        }

        console.error("useNpcCreator.load", loadError);
        const message = extractErrorMessage(loadError) ?? "Failed to fetch NPC data.";
        setError(message);
        toast.error(message);
        setCode((prev) => ({ ...prev, isLoading: false }));
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [form, mode, npcId, reloadToken]);

  const handleSaveDraft = useCallback(async (data: CreatorFormData) => {
    const normalized = normalizeFormData(data);

    try {
      const command = buildCreateNpcPayload(normalized);
      const response = await fetchJson<CreateNpcResponseDto>("/api/npcs", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(command),
      });

      const createdNpcId = response.id;

      if (!createdNpcId) {
        throw new Error("Brak identyfikatora NPC w odpowiedzi serwera.");
      }

      if (normalized.is_shop_active && (normalized.shop_items?.length ?? 0) > 0) {
        const shopCommand = buildShopItemsCommand(normalized.shop_items ?? []);
        await fetchJson(`/api/npcs/${createdNpcId}/shop-items`, {
          method: "PUT",
          headers: JSON_HEADERS,
          body: JSON.stringify(shopCommand),
        });
      }

      if (normalized.is_keywords_active && (normalized.keywords?.length ?? 0) > 0) {
        const keywordsCommand = buildKeywordsCommand(normalized.keywords ?? []);
        await fetchJson(`/api/npcs/${createdNpcId}/keywords`, {
          method: "PUT",
          headers: JSON_HEADERS,
          body: JSON.stringify(keywordsCommand),
        });
      }

      toast.success("Draft saved successfully.");

      if (typeof window !== "undefined") {
        window.location.assign(`/creator/${createdNpcId}`);
      }
    } catch (saveError) {
      console.error("useNpcCreator.handleSaveDraft", saveError);
      const message = extractErrorMessage(saveError) ?? "Failed to save draft.";
      toast.error(message);
    }
  }, []);

  const handleSaveChanges = useCallback(
    async (data: CreatorFormData) => {
      if (!npcId) {
        toast.error("Brak identyfikatora NPC.");
        return;
      }

      const normalized = normalizeFormData(data);
      const initial = initialDataRef.current;

      const nameChanged = normalized.name !== initial.name;
      const lookChanged = hasLookChanged(normalized, initial);
      const modulesChanged =
        normalized.is_shop_active !== initial.is_shop_active ||
        normalized.is_keywords_active !== initial.is_keywords_active;
      const shopChanged = hasShopItemsChanged(normalized, initial);
      const keywordsChanged = hasKeywordsChanged(normalized, initial);

      const shouldClearShop = !normalized.is_shop_active && initial.is_shop_active;
      const shouldClearKeywords = !normalized.is_keywords_active && initial.is_keywords_active;

      const updatePayload: UpdateNpcCommandInput = {};

      if (nameChanged) {
        updatePayload.name = normalized.name;
      }

      if (lookChanged) {
        updatePayload.look = buildNpcLookPayload(normalized);
      }

      if (modulesChanged) {
        updatePayload.modules = {
          shopEnabled: normalized.is_shop_active,
          keywordsEnabled: normalized.is_keywords_active,
        } satisfies UpdateNpcCommandInput["modules"];
      }

      if (
        !nameChanged &&
        !lookChanged &&
        !modulesChanged &&
        !shopChanged &&
        !keywordsChanged &&
        !shouldClearShop &&
        !shouldClearKeywords
      ) {
        toast.info("Brak zmian do zapisania.");
        return;
      }

      try {
        if (Object.keys(updatePayload).length > 0) {
          await fetchJson(`/api/npcs/${npcId}`, {
            method: "PATCH",
            headers: JSON_HEADERS,
            body: JSON.stringify(updatePayload),
          });
        }

        if (normalized.is_shop_active ? shopChanged : shouldClearShop) {
          const shopCommand = normalized.is_shop_active
            ? buildShopItemsCommand(normalized.shop_items ?? [])
            : ({ items: [] } satisfies BulkReplaceNpcShopItemsCommandInput);

          await fetchJson(`/api/npcs/${npcId}/shop-items`, {
            method: "PUT",
            headers: JSON_HEADERS,
            body: JSON.stringify(shopCommand),
          });
        }

        if (normalized.is_keywords_active ? keywordsChanged : shouldClearKeywords) {
          const keywordsCommand = normalized.is_keywords_active
            ? buildKeywordsCommand(normalized.keywords ?? [])
            : ({ items: [] } satisfies BulkReplaceNpcKeywordsCommandInput);

          await fetchJson(`/api/npcs/${npcId}/keywords`, {
            method: "PUT",
            headers: JSON_HEADERS,
            body: JSON.stringify(keywordsCommand),
          });
        }

        initialDataRef.current = normalized;
        form.reset(normalized, { keepDirty: false, keepErrors: false });
        toast.success("Changes saved successfully.");
      } catch (updateError) {
        console.error("useNpcCreator.handleSaveChanges", updateError);
        const message = extractErrorMessage(updateError) ?? "Failed to save changes.";
        toast.error(message);
      }
    },
    [form, npcId]
  );

  const handleGenerate = useCallback(
    async (data: CreatorFormData) => {
      if (!npcId) {
        toast.error("Save the NPC before attempting to generate XML.");
        return;
      }

      if (POLLABLE_STATUSES.has(generationState.status)) {
        toast.info("Generation is already in progress. Please wait for the current job to finish.");
        return;
      }

      const commandPayload = {
        regenerate: generationState.status === "succeeded" || generationState.status === "failed",
        currentXml: code.xml?.trim().length ? code.xml : null,
      } satisfies Parameters<typeof buildTriggerGenerationCommand>[0];

      const command = buildTriggerGenerationCommand(commandPayload);

      try {
        setGenerationState((prev) => ({
          ...prev,
          status: "processing",
          jobId: null,
          error: null,
        }));
        setCode((prev) => ({ ...prev, isLoading: true }));

        const response = await fetchJson<TriggerNpcGenerationResponseDto>(`/api/npcs/${npcId}/generate`, {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify(command),
        });

        setGenerationState((prev) => ({
          ...prev,
          status: response.status,
          jobId: response.jobId,
          error: null,
        }));
      } catch (generateError) {
        console.error("useNpcCreator.handleGenerate", generateError);
        const message = extractErrorMessage(generateError) ?? "Failed to trigger generation.";
        setGenerationState((prev) => ({ ...prev, status: "failed", error: message }));
        setCode((prev) => ({ ...prev, isLoading: false }));
        toast.error(message);
      }
    },
    [code.xml, generationState.status, npcId]
  );

  const handleGenerationPollingSuccess = useCallback((payload: GenerationJobStatusResponseDto) => {
    setGenerationState({
      status: payload.status,
      jobId: payload.jobId,
      xml: payload.xml ?? null,
      error: payload.error?.message ?? null,
      contentSizeBytes: payload.contentSizeBytes ?? null,
      updatedAt: payload.updatedAt ?? null,
    });

    if (payload.status === "succeeded" && payload.xml) {
      setCode((prev) => ({
        ...prev,
        xml: payload.xml ?? prev.xml,
        contentSizeBytes: payload.contentSizeBytes ?? prev.contentSizeBytes,
        isLoading: false,
        lastUpdatedAt: payload.updatedAt ?? new Date().toISOString(),
      }));
      toast.success("XML generated successfully.");
    } else if (payload.status === "failed") {
      setCode((prev) => ({ ...prev, isLoading: false }));
      const message = payload.error?.message ?? "Generation failed.";
      toast.error(message);
    } else {
      setCode((prev) => ({ ...prev, isLoading: true }));
    }
  }, []);

  const handleGenerationPollingError = useCallback((pollError: unknown) => {
    const message = extractErrorMessage(pollError) ?? "Failed to check generation status.";
    setGenerationState((prev) => ({ ...prev, status: "failed", error: message }));
    setCode((prev) => ({ ...prev, isLoading: false }));
    toast.error(message);
  }, []);

  const shouldPollGeneration = useMemo(
    () => Boolean(generationState.jobId && POLLABLE_STATUSES.has(generationState.status)),
    [generationState.jobId, generationState.status]
  );

  const reload = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  return {
    npcId,
    mode,
    form,
    isLoading,
    error,
    code,
    generationState,
    shouldPollGeneration,
    handleSaveDraft,
    handleSaveChanges,
    handleGenerate,
    handleGenerationPollingSuccess,
    handleGenerationPollingError,
    reload,
  } satisfies UseNpcCreatorResult;
}

function buildCreateNpcPayload(data: CreatorFormData): CreateNpcCommandInput {
  return {
    clientRequestId: crypto.randomUUID(),
    name: data.name,
    look: buildNpcLookPayload(data),
    stats: { ...DEFAULT_STATS },
    messages: { ...DEFAULT_MESSAGES },
    modules: {
      focusEnabled: false,
      travelEnabled: false,
      voiceEnabled: false,
      shopEnabled: data.is_shop_active,
      shopMode: "trade_window",
      keywordsEnabled: data.is_keywords_active,
    },
    contentSizeBytes: 0,
  } satisfies CreateNpcCommandInput;
}

function buildNpcLookPayload(data: CreatorFormData): NpcLookDto {
  return {
    type: "player",
    typeId: data.look_type,
    itemId: null,
    head: data.look_head,
    body: data.look_body,
    legs: data.look_legs,
    feet: data.look_feet,
    addons: data.look_addons,
    mount: null,
  };
}

function buildShopItemsCommand(items: CreatorShopItemFormData[]): BulkReplaceNpcShopItemsCommandInput {
  return {
    items: items.map((item) => ({
      listType: item.list_type,
      name: item.name.trim(),
      itemId: Number(item.item_id),
      price: Number(item.price),
      subtype: coerceOptionalNumber(item.subtype),
      charges: coerceOptionalNumber(item.charges),
      realName: normalizeOptionalString(item.real_name),
      containerItemId: coerceOptionalNumber(item.container_item_id),
    })),
  } satisfies BulkReplaceNpcShopItemsCommandInput;
}

function buildKeywordsCommand(items: CreatorKeywordFormData[]): BulkReplaceNpcKeywordsCommandInput {
  return {
    items: items.map((item, index) => ({
      response: item.response_text.trim(),
      sortIndex: index,
      phrases: item.phrases.map((phrase) => phrase.trim()),
    })),
  } satisfies BulkReplaceNpcKeywordsCommandInput;
}

function buildTriggerGenerationCommand(payload: { regenerate: boolean; currentXml: string | null }): {
  regenerate: boolean;
  currentXml: string | null;
} {
  return {
    regenerate: payload.regenerate,
    currentXml: payload.currentXml,
  };
}

function normalizeFormData(input: CreatorFormData): CreatorFormData {
  return {
    name: input.name.trim(),
    look_type: Number(input.look_type),
    look_head: Number(input.look_head),
    look_body: Number(input.look_body),
    look_legs: Number(input.look_legs),
    look_feet: Number(input.look_feet),
    look_addons: Number(input.look_addons),
    is_shop_active: Boolean(input.is_shop_active),
    is_keywords_active: Boolean(input.is_keywords_active),
    shop_items: normalizeShopItems(input.shop_items ?? []),
    keywords: normalizeKeywords(input.keywords ?? []),
  } satisfies CreatorFormData;
}

function normalizeShopItems(items: CreatorShopItemFormData[]): CreatorShopItemFormData[] {
  return items.map((item) => ({
    list_type: item.list_type,
    name: item.name.trim(),
    item_id: Number(item.item_id),
    price: Number(item.price),
    subtype: coerceOptionalNumber(item.subtype),
    charges: coerceOptionalNumber(item.charges),
    real_name: normalizeOptionalString(item.real_name),
    container_item_id: coerceOptionalNumber(item.container_item_id),
  }));
}

function normalizeKeywords(items: CreatorKeywordFormData[]): CreatorKeywordFormData[] {
  return items.map((item) => ({
    response_text: item.response_text.trim(),
    phrases: item.phrases.map((phrase) => phrase.trim()),
  }));
}

function hasLookChanged(current: CreatorFormData, initial: CreatorFormData): boolean {
  return (
    current.look_type !== initial.look_type ||
    current.look_head !== initial.look_head ||
    current.look_body !== initial.look_body ||
    current.look_legs !== initial.look_legs ||
    current.look_feet !== initial.look_feet ||
    current.look_addons !== initial.look_addons
  );
}

function hasShopItemsChanged(current: CreatorFormData, initial: CreatorFormData): boolean {
  const currentItems = current.shop_items ?? [];
  const initialItems = initial.shop_items ?? [];

  if (currentItems.length !== initialItems.length) {
    return true;
  }

  return JSON.stringify(currentItems) !== JSON.stringify(initialItems);
}

function hasKeywordsChanged(current: CreatorFormData, initial: CreatorFormData): boolean {
  const currentKeywords = current.keywords ?? [];
  const initialKeywords = initial.keywords ?? [];

  if (currentKeywords.length !== initialKeywords.length) {
    return true;
  }

  return JSON.stringify(currentKeywords) !== JSON.stringify(initialKeywords);
}

function mapNpcDetailToForm(
  npc: NpcDetailResponseDto,
  shopItems: NpcShopItemDto[],
  keywords: NpcKeywordDto[]
): CreatorFormData {
  const sortedKeywords = [...keywords].sort((a, b) => a.sortIndex - b.sortIndex);

  const formData: CreatorFormData = {
    name: npc.name ?? DEFAULT_FORM_VALUES.name,
    look_type: npc.look.typeId ?? DEFAULT_FORM_VALUES.look_type,
    look_head: npc.look.head ?? DEFAULT_FORM_VALUES.look_head,
    look_body: npc.look.body ?? DEFAULT_FORM_VALUES.look_body,
    look_legs: npc.look.legs ?? DEFAULT_FORM_VALUES.look_legs,
    look_feet: npc.look.feet ?? DEFAULT_FORM_VALUES.look_feet,
    look_addons: npc.look.addons ?? DEFAULT_FORM_VALUES.look_addons,
    is_shop_active: Boolean(npc.modules.shopEnabled),
    is_keywords_active: Boolean(npc.modules.keywordsEnabled),
    shop_items: npc.modules.shopEnabled ? shopItems.map(mapShopItemDtoToForm) : DEFAULT_FORM_VALUES.shop_items,
    keywords: npc.modules.keywordsEnabled ? sortedKeywords.map(mapKeywordDtoToForm) : DEFAULT_FORM_VALUES.keywords,
  };

  return normalizeFormData(formData);
}

function mapShopItemDtoToForm(item: NpcShopItemDto): CreatorShopItemFormData {
  return {
    list_type: item.listType,
    name: item.name,
    item_id: item.itemId,
    price: item.price,
    subtype: item.subtype ?? undefined,
    charges: item.charges ?? undefined,
    real_name: item.realName ?? undefined,
    container_item_id: item.containerItemId ?? undefined,
  };
}

function mapKeywordDtoToForm(item: NpcKeywordDto): CreatorKeywordFormData {
  return {
    response_text: item.response,
    phrases: item.phrases.map((phrase) => phrase.phrase).filter(Boolean),
  };
}

async function fetchJson<T>(input: RequestInfo | URL, init: RequestInit, signal?: AbortSignal): Promise<T> {
  const headers = mergeHeaders(init.headers, init.body ? JSON_HEADERS : GET_HEADERS);
  const response = await fetch(input, { ...init, headers, signal });

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  const isJson = contentType.includes("application/json");

  let payload: unknown = null;

  if (isJson) {
    payload = await response.json().catch(() => null);
  }

  if (!response.ok) {
    const message = extractApiErrorMessage(payload) ?? `Request failed (${response.status}).`;
    throw new ApiRequestError(message, response.status, payload);
  }

  return (payload ?? ({} as unknown)) as T;
}

function mergeHeaders(...sources: (HeadersInit | undefined)[]): HeadersInit {
  const result = new Headers();

  for (const source of sources) {
    if (!source) {
      continue;
    }

    const headers = new Headers(source);
    headers.forEach((value, key) => {
      result.set(key, value);
    });
  }

  return Object.fromEntries(result.entries());
}

function coerceOptionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function extractApiErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const maybeError = payload as { error?: { message?: unknown } };

  const message = maybeError.error?.message;

  return typeof message === "string" ? message : null;
}

function extractErrorMessage(error: unknown): string | null {
  if (!error) {
    return null;
  }

  if (error instanceof ApiRequestError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return null;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
