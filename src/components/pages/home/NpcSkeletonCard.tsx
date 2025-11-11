import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function NpcSkeletonCard() {
  return (
    <Card className="flex h-full min-h-[392px] flex-col border-border/50">
      <CardHeader className="space-y-4">
        <Skeleton className="h-36 w-full" />
        <CardTitle>
          <Skeleton className="h-5 w-3/4" />
        </CardTitle>
        <CardDescription>
          <Skeleton className="h-4 w-1/2" />
        </CardDescription>
      </CardHeader>
      <CardContent className="mt-auto flex items-center gap-2">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-20" />
      </CardContent>
    </Card>
  );
}
