import { useCallback, useEffect, useState } from "react";

import { createRootPage, type AppShellProps } from "@/components/AppShell";

import { ProfileAside } from "./ProfileAside";
import { ProfileLayout } from "./ProfileLayout";
import { ProfileSubnav } from "./ProfileSubnav";
import { NpcTabs, type TabKey } from "./NpcTabs";
import { NpcsSection } from "./NpcsSection";
import { ProfileEmptyState } from "./ProfileEmptyState";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { EditProfileDialog, type EditProfileFormValues } from "./EditProfileDialog";
import { useAuth } from "@/components/auth/useAuth";
import { toast } from "sonner";
import { useProfileMe } from "@/hooks/useProfileMe";
import { ProfileLoadingState } from "./ProfileLoadingState";

export interface ProfileAppProps extends AppShellProps {
  userId: string;
}

function ProfileApp({ userId }: ProfileAppProps) {
  const { profile, isLoading, error, retry } = useProfileMe();
  const { refresh } = useAuth();
  const [activeSection, setActiveSection] = useState<"npcs" | "overview">("npcs");
  const [tab, setTab] = useState<TabKey>("drafts");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [listRevision, setListRevision] = useState(0);

  const onSubmit = useCallback(
    async (values: EditProfileFormValues) => {
      try {
        const response = await fetch("/api/profiles/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ displayName: values.displayName, bio: values.bio }),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.error?.message ?? `Failed with status ${response.status}`);
        }

        await refresh();
        await retry();
        setListRevision((v) => v + 1);
        setIsEditOpen(false);
        toast.success("Profile updated");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to update profile");
      }
    },
    [refresh, retry]
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!isLoading && profile && profile.id && userId && profile.id !== userId) {
      window.location.replace(`/profile/${profile.id}`);
    }
  }, [isLoading, profile, userId]);

  const showNotLogged = !isLoading && !profile && !error;
  const isCompletelyEmpty = Boolean(
    !isLoading && profile && (profile.npcCounts?.draft ?? 0) === 0 && (profile.npcCounts?.published ?? 0) === 0
  );

  return (
    <>
      <ProfileSubnav
        active={activeSection}
        totalCount={(profile?.npcCounts?.draft ?? 0) + (profile?.npcCounts?.published ?? 0)}
        onChange={setActiveSection}
      />

      <ProfileLayout
        top={
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" className="self-start" asChild>
              <a href="/" className="inline-flex items-center gap-2">
                <ArrowLeft className="size-4" aria-hidden />
                Back to Home
              </a>
            </Button>

            {profile ? (
              <Button variant="secondary" size="sm" onClick={() => setIsEditOpen(true)}>
                Edit Profile
              </Button>
            ) : null}
          </div>
        }
        header={<ProfileAside profile={profile} loading={isLoading} error={error} />}
      >
        {showNotLogged ? (
          <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-3 rounded-2xl border p-8 text-center">
            <p className="text-sm text-muted-foreground">You need to sign in to view your profile.</p>
            <Button asChild size="sm">
              <a href="/login">Sign in</a>
            </Button>
          </div>
        ) : error ? (
          <div
            className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-3 rounded-2xl border p-8 text-center"
            role="alert"
          >
            <p className="text-sm font-medium text-destructive">Could not load profile data.</p>
            <Button size="sm" variant="outline" onClick={() => retry()}>
              Try again
            </Button>
          </div>
        ) : isLoading ? (
          <ProfileLoadingState />
        ) : isCompletelyEmpty ? (
          <ProfileEmptyState />
        ) : (
          <div className="flex flex-col gap-6">
            <NpcTabs value={tab} counts={profile?.npcCounts ?? null} onValueChange={setTab} />
            {activeSection === "npcs" && profile ? (
              <NpcsSection key={`mine-${tab}-${listRevision}`} tab={tab} counts={profile.npcCounts} />
            ) : null}
          </div>
        )}
      </ProfileLayout>

      <EditProfileDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        initialName={profile?.displayName ?? ""}
        onSubmit={onSubmit}
      />
    </>
  );
}

export const ProfilePage = createRootPage<ProfileAppProps>(ProfileApp);

export default ProfileApp;
