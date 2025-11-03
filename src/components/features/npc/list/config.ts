import type { GetNpcListQueryDto } from "@/types/npc";

export type SortValue = "newest" | "oldest";
export type FilterValue = "all" | "shop" | "keywords";

export interface SortOption {
  value: SortValue;
  label: string;
  params: Pick<GetNpcListQueryDto, "sort" | "order">;
}

export interface FilterTag {
  value: FilterValue;
  label: string;
  params: Pick<GetNpcListQueryDto, "shopEnabled" | "keywordsEnabled">;
}

export const SORT_OPTIONS: readonly SortOption[] = [
  {
    value: "newest",
    label: "Newest",
    params: {
      sort: "published_at",
      order: "desc",
    },
  },
  {
    value: "oldest",
    label: "Oldest",
    params: {
      sort: "published_at",
      order: "asc",
    },
  },
] as const;

export const FILTER_TAGS: readonly FilterTag[] = [
  {
    value: "all",
    label: "All",
    params: {
      shopEnabled: undefined,
      keywordsEnabled: undefined,
    },
  },
  {
    value: "shop",
    label: "Shop",
    params: {
      shopEnabled: true,
      keywordsEnabled: undefined,
    },
  },
  {
    value: "keywords",
    label: "Keywords",
    params: {
      shopEnabled: undefined,
      keywordsEnabled: true,
    },
  },
] as const;

export const DEFAULT_SORT = SORT_OPTIONS[0];
export const DEFAULT_FILTER = FILTER_TAGS[0];

export function getSortOptionFromParam(param: string | null | undefined): SortOption {
  if (!param) {
    return DEFAULT_SORT;
  }

  const normalized = param.toLowerCase();
  const match = SORT_OPTIONS.find((option) => option.value === normalized);
  return match ?? DEFAULT_SORT;
}

export function getFilterTagFromParam(param: string | null | undefined): FilterTag {
  if (!param) {
    return DEFAULT_FILTER;
  }

  const normalized = param.toLowerCase();
  const match = FILTER_TAGS.find((tag) => tag.value === normalized);
  return match ?? DEFAULT_FILTER;
}

export function resolveSortOption(searchParams: URLSearchParams): SortOption {
  return getSortOptionFromParam(searchParams.get("sort"));
}

export function resolveFilterTag(searchParams: URLSearchParams): FilterTag {
  return getFilterTagFromParam(searchParams.get("filter"));
}

export function createNpcListQuery(
  sort: SortOption,
  filter: FilterTag,
  overrides: Partial<Omit<GetNpcListQueryDto, "sort" | "order">> = {}
): GetNpcListQueryDto {
  const { shopEnabled, keywordsEnabled } = filter.params;

  const base: GetNpcListQueryDto = {
    visibility: "public",
    sort: sort.params.sort,
    order: sort.params.order,
  };

  const withFilters: GetNpcListQueryDto = {
    ...base,
    shopEnabled,
    keywordsEnabled,
  };

  return {
    ...withFilters,
    ...overrides,
  };
}

export function createNpcListSearchParams(
  sort: SortOption,
  filter: FilterTag,
  base?: URLSearchParams
): URLSearchParams {
  const params = new URLSearchParams(base ? base.toString() : undefined);

  params.set("sort", sort.value);
  params.set("filter", filter.value);

  return params;
}
