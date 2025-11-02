import { Compass } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ProfileEmptyState() {
  return (
    <Card className="flex flex-col items-center justify-center gap-4 border-dashed bg-muted/10 py-10 text-center">
      <CardHeader className="items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <Compass className="size-6 text-muted-foreground" aria-hidden />
        </div>
        <CardTitle className="text-xl">You have no NPCs yet</CardTitle>
        <CardDescription className="max-w-md text-balance text-muted-foreground">
          Start by creating your first NPC. Drafts will appear here and you can publish them later.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        <Button asChild>
          <a href="/creator">Create NPC</a>
        </Button>
      </CardContent>
    </Card>
  );
}
