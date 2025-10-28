import { AlertCircle, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ErrorStateProps {
  onRetry?: () => void;
}

export function ErrorState({ onRetry }: ErrorStateProps) {
  return (
    <Card className="border-destructive/40 bg-destructive/5 text-destructive">
      <CardHeader className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <AlertCircle className="size-5" aria-hidden />
          <CardTitle className="text-lg font-semibold">Unable to load featured NPCs</CardTitle>
        </div>
        <CardDescription className="text-sm text-destructive/90">
          Something went wrong while fetching highlighted NPCs. Please try refreshing the list in a moment.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
          <RefreshCcw className="size-4" aria-hidden />
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}
