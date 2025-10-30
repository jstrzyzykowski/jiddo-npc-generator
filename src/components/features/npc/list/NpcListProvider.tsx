import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  createNpcListSearchParams,
  getFilterTagFromParam,
  getSortOptionFromParam,
  type FilterTag,
  type SortOption,
} from "./config";

export interface NpcListContextValue {
  sort: SortOption;
  setSort: (nextSort: SortOption) => void;
  filter: FilterTag;
  setFilter: (nextFilter: FilterTag) => void;
}

interface NpcListProviderProps {
  initialSort: SortOption;
  initialFilter: FilterTag;
  children: ReactNode;
}

const NpcListContext = createContext<NpcListContextValue | null>(null);

export function NpcListProvider({ initialSort, initialFilter, children }: NpcListProviderProps) {
  const [sort, setSortState] = useState<SortOption>(() => getSortOptionFromParam(initialSort.value));
  const [filter, setFilterState] = useState<FilterTag>(() => getFilterTagFromParam(initialFilter.value));
  const hasSynchronizedRef = useRef(false);

  useEffect(() => {
    const normalized = getSortOptionFromParam(initialSort.value);
    setSortState((current) => (current.value === normalized.value ? current : normalized));
  }, [initialSort]);

  useEffect(() => {
    const normalized = getFilterTagFromParam(initialFilter.value);
    setFilterState((current) => (current.value === normalized.value ? current : normalized));
  }, [initialFilter]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const nextSort = getSortOptionFromParam(params.get("sort"));
      const nextFilter = getFilterTagFromParam(params.get("filter"));

      setSortState((current) => (current.value === nextSort.value ? current : nextSort));
      setFilterState((current) => (current.value === nextFilter.value ? current : nextFilter));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);
    const baseParams = new URLSearchParams(url.search);

    baseParams.delete("cursor");

    const params = createNpcListSearchParams(sort, filter, baseParams);
    const search = params.toString();
    const nextUrl = `${url.pathname}${search ? `?${search}` : ""}${url.hash}`;

    if (url.search === (search ? `?${search}` : "")) {
      return;
    }

    const state = { ...window.history.state };

    if (hasSynchronizedRef.current) {
      window.history.pushState(state, "", nextUrl);
    } else {
      window.history.replaceState(state, "", nextUrl);
      hasSynchronizedRef.current = true;
    }
  }, [sort, filter]);

  const setSort = useCallback((nextSort: SortOption) => {
    setSortState((current) => (current.value === nextSort.value ? current : nextSort));
  }, []);

  const setFilter = useCallback((nextFilter: FilterTag) => {
    setFilterState((current) => (current.value === nextFilter.value ? current : nextFilter));
  }, []);

  const value = useMemo<NpcListContextValue>(
    () => ({
      sort,
      setSort,
      filter,
      setFilter,
    }),
    [sort, setSort, filter, setFilter]
  );

  return <NpcListContext.Provider value={value}>{children}</NpcListContext.Provider>;
}

export function useNpcListContext(): NpcListContextValue {
  const context = useContext(NpcListContext);

  if (!context) {
    throw new Error("useNpcListContext must be used within an NpcListProvider");
  }

  return context;
}

export function useOptionalNpcListContext(): NpcListContextValue | null {
  return useContext(NpcListContext);
}
