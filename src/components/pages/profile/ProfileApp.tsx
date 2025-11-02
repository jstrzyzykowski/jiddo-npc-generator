import { useEffect, useState } from "react";

import { createRootPage, type AppShellProps } from "@/components/AppShell";

import { ProfileAside } from "./ProfileAside";
import { ProfileLayout } from "./ProfileLayout";
import { ProfileSubnav } from "./ProfileSubnav";
import { NpcTabs, type TabKey } from "./NpcTabs";
import { NpcsSection } from "./NpcsSection";
import { ProfileEmptyState } from "./ProfileEmptyState";
import { Button } from "@/components/ui/button";
import { useProfileMe } from "@/hooks/useProfileMe";

export interface ProfileAppProps extends AppShellProps {
  userId: string;
}

function ProfileApp({ userId }: ProfileAppProps) {
  const { profile, isLoading, error, retry } = useProfileMe();
  const [activeSection, setActiveSection] = useState<"npcs" | "overview">("npcs");
  const [tab, setTab] = useState<TabKey>("drafts");

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

      <ProfileLayout aside={<ProfileAside profile={profile} loading={isLoading} error={error} />}>
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
        ) : isCompletelyEmpty ? (
          <ProfileEmptyState />
        ) : (
          <div className="flex flex-col gap-6">
            <NpcTabs value={tab} counts={profile?.npcCounts ?? null} onValueChange={setTab} />
            {activeSection === "npcs" && profile ? <NpcsSection tab={tab} counts={profile.npcCounts} /> : null}
          </div>
        )}
      </ProfileLayout>
    </>
  );
}

export const ProfilePage = createRootPage<ProfileAppProps>(ProfileApp);

export default ProfileApp;
