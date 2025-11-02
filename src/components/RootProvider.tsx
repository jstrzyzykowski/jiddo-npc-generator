import { ArrowUp } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { NpcListProvider } from "@/components/features/npc/list/NpcListProvider";
import type { FilterTag, SortOption } from "@/components/features/npc/list/config";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

import { AuthProvider } from "./auth/AuthProvider";
import { Footer } from "./layout/Footer";
import { SecondaryNavbar } from "./layout/SecondaryNavbar";
import { Topbar } from "./layout/Topbar";

interface RootProviderProps {
  currentPath: string;
  pageProps?: Record<string, unknown>;
  children: ReactNode;
}

export function RootProvider({ currentPath, pageProps, children }: RootProviderProps) {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [renderScrollTop, setRenderScrollTop] = useState(false);
  const [isHidingScrollTop, setIsHidingScrollTop] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 160);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (showScrollTop) {
      setIsHidingScrollTop(false);
      setRenderScrollTop(true);
      return;
    }

    if (renderScrollTop) {
      setIsHidingScrollTop(true);
      const timer = setTimeout(() => {
        setRenderScrollTop(false);
        setIsHidingScrollTop(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [showScrollTop, renderScrollTop]);

  const handleScrollTop = () => {
    if (typeof window === "undefined") {
      return;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const npcListProps = shouldProvideNpcList(currentPath, pageProps) ? pageProps : null;

  const isProfilePage = currentPath.startsWith("/profile");

  const layout = (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <Topbar />
      {!isProfilePage ? <SecondaryNavbar currentPath={currentPath} /> : null}
      <main className="flex flex-1 flex-col">{children}</main>
      <Footer />

      {renderScrollTop ? (
        <Button
          size="icon"
          variant="secondary"
          className={cn(
            "fixed bottom-20 right-6 z-50 shadow-lg",
            isHidingScrollTop ? "animate-slide-down" : "animate-slide-up"
          )}
          onClick={handleScrollTop}
          aria-label="Scroll to top"
        >
          <ArrowUp className="size-4" />
        </Button>
      ) : null}
    </div>
  );

  return (
    <AuthProvider>
      {npcListProps ? (
        <NpcListProvider initialSort={npcListProps.initialSort} initialFilter={npcListProps.initialFilter}>
          {layout}
        </NpcListProvider>
      ) : (
        layout
      )}
      <Toaster position="top-center" />
    </AuthProvider>
  );
}

interface NpcListProviderPageProps extends Record<string, unknown> {
  initialSort: SortOption;
  initialFilter: FilterTag;
}

function shouldProvideNpcList(
  currentPath: string,
  pageProps: Record<string, unknown> | undefined
): pageProps is NpcListProviderPageProps {
  if (!currentPath.startsWith("/npcs")) {
    return false;
  }

  return isNpcListProviderProps(pageProps);
}

function isNpcListProviderProps(value: unknown): value is NpcListProviderPageProps {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<NpcListProviderPageProps>;
  return isSortOption(candidate.initialSort) && isFilterTag(candidate.initialFilter);
}

function isSortOption(value: unknown): value is SortOption {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as SortOption;
  return (
    typeof candidate.value === "string" &&
    typeof candidate.label === "string" &&
    typeof candidate.params === "object" &&
    candidate.params !== null &&
    typeof candidate.params.sort === "string" &&
    typeof candidate.params.order === "string"
  );
}

function isFilterTag(value: unknown): value is FilterTag {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as FilterTag;
  const params = candidate.params;

  const shopValid = typeof params?.shopEnabled === "boolean" || typeof params?.shopEnabled === "undefined";
  const keywordsValid = typeof params?.keywordsEnabled === "boolean" || typeof params?.keywordsEnabled === "undefined";

  return typeof candidate.value === "string" && typeof candidate.label === "string" && shopValid && keywordsValid;
}
