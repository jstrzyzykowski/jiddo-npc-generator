import { useCallback, useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils";

const STORAGE_KEY = "theme";

type Theme = "light" | "dark";

const prefersDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

function getInitialTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }

  return prefersDark() ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  localStorage.setItem(STORAGE_KEY, theme);
}

interface ThemeToggleProps {
  className?: string;
  label?: string;
}

export function ThemeToggle({ className, label }: ThemeToggleProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") {
      return "light";
    }

    return getInitialTheme();
  });

  useEffect(() => {
    if (!isMounted && typeof window !== "undefined") {
      const initial = getInitialTheme();
      setTheme(initial);
      applyTheme(initial);
      setIsMounted(true);
      return;
    }

    if (isMounted) {
      applyTheme(theme);
    }
  }, [isMounted, theme]);

  const handleToggle = useCallback((checked: boolean) => {
    setTheme(checked ? "dark" : "light");
  }, []);

  const checked = theme === "dark";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {label ? <span className="text-sm text-muted-foreground">{label}</span> : null}
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-md border border-transparent bg-muted/40 px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        onClick={() => handleToggle(!checked)}
        aria-label={checked ? "Activate light mode" : "Activate dark mode"}
      >
        {checked ? <Moon className="size-4" /> : <Sun className="size-4" />}
      </button>
    </div>
  );
}
