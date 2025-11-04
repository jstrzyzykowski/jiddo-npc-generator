import { cn } from "@/lib/utils";

interface LogoLinkProps {
  href?: string;
  className?: string;
}

export function LogoLink({ href = "/", className }: LogoLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        "inline-flex items-center gap-2 font-semibold text-lg tracking-tight text-foreground transition-colors hover:text-primary",
        className
      )}
      aria-label="Go to homepage"
    >
      <span className="rounded-md bg-primary px-2 py-1 text-sm font-bold text-primary-foreground">JIDDO</span>
      <span className="text-base font-semibold">NPC</span>
    </a>
  );
}
