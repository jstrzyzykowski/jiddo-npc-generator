import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function NpcSkeletonCard() {
  return (
    <Card className="flex h-full flex-col border-dashed">
      <CardHeader className="space-y-2">
        <Skeleton className="h-40 w-full" />
        <CardTitle>
          <Skeleton className="h-5 w-3/4" />
        </CardTitle>
        <CardDescription>
          <Skeleton className="h-4 w-1/2" />
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-2">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-16" />
      </CardContent>
    </Card>
  );
}
