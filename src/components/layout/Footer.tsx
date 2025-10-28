import { cn } from "@/lib/utils";

interface FooterProps {
  isVisible: boolean;
}

export function Footer({ isVisible }: FooterProps) {
  return (
    <footer
      className={cn(
        "sticky bottom-0 z-30 border-t bg-background/95 backdrop-blur transition-transform duration-300",
        isVisible ? "translate-y-0" : "translate-y-full"
      )}
    >
      <div className="mx-auto flex h-12 w-full max-w-[1200px] items-center justify-between gap-4 px-4 text-sm text-muted-foreground">
        <span>© Jiddo NPC {new Date().getFullYear()}</span>
        <div className="flex items-center gap-3">
          <a href="/terms" className="hidden text-muted-foreground transition-colors hover:text-foreground sm:inline">
            Terms of Service
          </a>
          <a href="/privacy" className="hidden text-muted-foreground transition-colors hover:text-foreground sm:inline">
            Privacy
          </a>
        </div>
      </div>
    </footer>
  );
}
