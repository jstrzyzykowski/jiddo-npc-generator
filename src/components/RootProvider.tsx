import { ArrowUp } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";

import { AuthProvider } from "./auth/AuthProvider";
import { Footer } from "./layout/Footer";
import { SecondaryNavbar } from "./layout/SecondaryNavbar";
import { Topbar } from "./layout/Topbar";

interface RootProviderProps {
  currentPath: string;
  children: ReactNode;
}

export function RootProvider({ currentPath, children }: RootProviderProps) {
  const lastScrollYRef = useRef(0);
  const [isSecondaryVisible, setSecondaryVisible] = useState(true);
  const [isFooterVisible, setFooterVisible] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollYRef.current;
      const isScrollingDown = delta > 4;
      const isScrollingUp = delta < -4;
      const nearTop = currentY < 64;

      if (nearTop || isScrollingUp) {
        setSecondaryVisible(true);
        setFooterVisible(true);
      } else if (isScrollingDown) {
        setSecondaryVisible(false);
        setFooterVisible(false);
      }

      setShowScrollTop(currentY > 160);
      lastScrollYRef.current = currentY;
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleScrollTop = () => {
    if (typeof window === "undefined") {
      return;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <AuthProvider>
      <div className="relative flex min-h-screen flex-col bg-background text-foreground">
        <Topbar />
        <SecondaryNavbar currentPath={currentPath} isVisible={isSecondaryVisible} />
        <main className="flex flex-1 flex-col">{children}</main>
        <Footer isVisible={isFooterVisible} />

        {showScrollTop && !isFooterVisible ? (
          <Button
            size="icon"
            variant="secondary"
            className="fixed bottom-6 right-6 z-50 shadow-lg"
            onClick={handleScrollTop}
            aria-label="Scroll to top"
          >
            <ArrowUp className="size-4" />
          </Button>
        ) : null}
      </div>
      <Toaster position="top-center" richColors closeButton />
    </AuthProvider>
  );
}
