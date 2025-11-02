import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import type { GetProfileMeResponseDto } from "@/types";

interface ProfileAsideProps {
  profile: GetProfileMeResponseDto | null;
  loading: boolean;
  error?: string | null;
}

export function ProfileAside({ profile, loading, error }: ProfileAsideProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
        <div className="flex items-center gap-3">
          <Skeleton className="size-12 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-2" role="alert" aria-live="assertive">
        <p className="text-sm font-medium text-destructive">Failed to load profile.</p>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">You are not signed in.</p>
        <a href="/login" className="text-sm font-medium underline underline-offset-4">
          Sign in to view your profile
        </a>
      </div>
    );
  }

  const initials = getInitials(profile.displayName);
  const joined = formatDate(profile.createdAt);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Avatar className="size-12">
          <AvatarFallback aria-hidden>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-base font-semibold">{profile.displayName}</span>
          {joined ? <span className="text-xs text-muted-foreground">Joined {joined}</span> : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-lg border p-3 text-sm">
        <div className="flex flex-col rounded-md bg-muted/40 p-3 text-center">
          <span className="text-xs text-muted-foreground">Drafts</span>
          <span className="text-lg font-semibold tabular-nums">{profile.npcCounts.draft ?? 0}</span>
        </div>
        <div className="flex flex-col rounded-md bg-muted/40 p-3 text-center">
          <span className="text-xs text-muted-foreground">Published</span>
          <span className="text-lg font-semibold tabular-nums">{profile.npcCounts.published ?? 0}</span>
        </div>
      </div>
    </div>
  );
}

function getInitials(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  const letters = parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return letters || "?";
}

function formatDate(value: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
  } catch {
    return null;
  }
}
