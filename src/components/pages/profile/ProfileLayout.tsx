import type { PropsWithChildren, ReactNode } from "react";

interface ProfileLayoutProps extends PropsWithChildren {
  header: ReactNode;
  top?: ReactNode;
}

export function ProfileLayout({ top, header, children }: ProfileLayoutProps) {
  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-4 py-10">
      {top ? <div>{top}</div> : null}
      <div className="rounded-2xl border border-border/60 bg-card/40 p-4 shadow-sm">{header}</div>

      <div className="relative">{children}</div>
    </div>
  );
}
