import { Bot, Plus } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ProfileEmptyState() {
  return (
    <Card className="flex flex-col justify-center gap-4 border-dashed bg-muted/10 py-10 text-center">
      <CardHeader className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <Bot className="size-6 text-muted-foreground" aria-hidden />
        </div>
        <CardTitle className="text-xl text-balance">You have no NPCs yet</CardTitle>
        <CardDescription className="max-w-md text-balance text-muted-foreground">
          Start by creating your first NPC. Drafts will appear here and you can publish them later.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        <Button asChild size="sm" className="justify-center">
          <a href="/creator" aria-label="Create NPC">
            <Plus className="size-4" />
            Create NPC
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
