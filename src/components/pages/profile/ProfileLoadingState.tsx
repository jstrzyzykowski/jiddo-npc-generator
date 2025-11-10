import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ProfileLoadingState() {
  return (
    <Card
      className="flex flex-col justify-center gap-4 border border-border/60 bg-muted/10 py-10 text-center"
      aria-busy="true"
      aria-live="polite"
    >
      <CardHeader className="flex flex-col items-center gap-3 text-center">
        <Skeleton className="size-12 rounded-full" />
        <Skeleton className="h-6 w-52" />
        <div className="flex flex-col items-center gap-1.5">
          <Skeleton className="h-4 w-80" />
          <Skeleton className="h-4 w-72" />
        </div>
      </CardHeader>
      <CardContent className="flex justify-center">
        <Skeleton className="h-9 w-32 rounded-md" />
      </CardContent>
    </Card>
  );
}
