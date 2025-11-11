import { cn } from "@/lib/utils";
import logo from "@/assets/images/comment.png";
import { Separator } from "@/components/ui/separator";

interface LogoLinkProps {
  href?: string;
  className?: string;
}

export function LogoLink({ className, ...props }: LogoLinkProps) {
  return (
    <a
      href="/"
      className={cn(
        "inline-flex flex-shrink-0 items-center gap-2 text-lg font-bold tracking-tight text-foreground",
        className
      )}
      {...props}
    >
      <img src={logo.src} alt="Jiddo NPC Logo" className="size-8" />
      <div className="hidden md:flex flex-col items-start animate-slide-in-left">
        <div className="inline-flex items-center">
          <span className="font-thin">Jiddo</span>
          <span className="font-black">NPC</span>
        </div>
        <span className="text-xs font-normal text-muted-foreground/50 -mt-1 tracking-wide">
          <span className="inline-flex items-center gap-2">
            TFS ≤ 1.5
            <span className="h-3">
              <Separator orientation="vertical" className="bg-muted-foreground/40" />
            </span>
            Legacy XML+Lua NPCs
          </span>
        </span>
      </div>
    </a>
  );
}
