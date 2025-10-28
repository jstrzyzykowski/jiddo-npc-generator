import { Compass } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function EmptyState() {
  return (
    <Card className="col-span-full flex flex-col items-center justify-center gap-4 border-dashed bg-muted/10 py-10 text-center">
      <CardHeader className="items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <Compass className="size-6 text-muted-foreground" aria-hidden />
        </div>
        <CardTitle className="text-xl">No featured NPCs yet</CardTitle>
        <CardDescription className="max-w-md text-balance text-muted-foreground">
          Once the community publishes new creations, they will appear here automatically. Check back soon or explore
          the full NPC directory.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        <a
          href="/npcs"
          className="text-sm font-medium text-primary underline decoration-dotted underline-offset-4 hover:text-primary/80"
        >
          Browse all NPCs
        </a>
      </CardContent>
    </Card>
  );
}
