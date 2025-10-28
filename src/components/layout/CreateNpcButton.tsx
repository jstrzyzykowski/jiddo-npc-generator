import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { useAuth } from "../auth/useAuth";

interface CreateNpcButtonProps {
  className?: string;
}

export function CreateNpcButton({ className }: CreateNpcButtonProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <Skeleton className={cn("h-9 w-[132px]", className)} />;
  }

  if (!user) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <Button className={cn("pointer-events-auto", className)} size="sm" variant="secondary" disabled>
              <Plus className="size-4" />
              Create NPC
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>Sign in to create an NPC</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Button asChild size="sm" className={className}>
      <a href="/creator" aria-label="Create NPC">
        <Plus className="size-4" />
        Create NPC
      </a>
    </Button>
  );
}
