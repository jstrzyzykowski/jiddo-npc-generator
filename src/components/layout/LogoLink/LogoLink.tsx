import { cn } from "@/lib/utils";
import logoSignet from "@/assets/images/comment.png";

interface LogoLinkProps {
  href?: string;
  className?: string;
}

export function LogoLink({ href = "/", className }: LogoLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        "inline-flex items-center flex-shrink-0 gap-2 font-semibold text-lg tracking-tight text-foreground transition-colors hover:text-primary",
        className
      )}
      aria-label="Go to homepage"
    >
      <img src={logoSignet.src} alt="Jiddo logo" className="h-7 w-auto" />
      <span className="hidden md:inline-flex items-center animate-slide-in-left">
        <span className="font-thin">Jiddo</span>
        <span className="font-black">NPC</span>
      </span>
    </a>
  );
}
