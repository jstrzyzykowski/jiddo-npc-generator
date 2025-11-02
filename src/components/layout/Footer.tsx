export function Footer() {
  return (
    <footer className="sticky bottom-0 z-30 border-t bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-12 w-full max-w-[1200px] items-center justify-between gap-4 px-4 text-sm text-muted-foreground">
        <span>© Jiddo NPC {new Date().getFullYear()}</span>
        <div className="flex items-center gap-3">
          <a
            href="/terms"
            aria-disabled="true"
            tabIndex={-1}
            onClick={(e) => e.preventDefault()}
            className="text-muted-foreground opacity-60 cursor-not-allowed pointer-events-none"
            title="Coming soon"
          >
            Terms of Service
          </a>
          <a
            href="/privacy"
            aria-disabled="true"
            tabIndex={-1}
            onClick={(e) => e.preventDefault()}
            className="text-muted-foreground opacity-60 cursor-not-allowed pointer-events-none"
            title="Coming soon"
          >
            Privacy
          </a>
        </div>
      </div>
    </footer>
  );
}
