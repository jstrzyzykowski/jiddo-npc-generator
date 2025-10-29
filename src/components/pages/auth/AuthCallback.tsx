import { useEffect } from "react";

import { createRootPage } from "@/components/AppShell";

import { AuthCallbackError } from "./AuthCallbackError";
import { Spinner } from "./Spinner";
import { useAuthCallback } from "./useAuthCallback";

function AuthCallbackPage() {
  const { status, error } = useAuthCallback();

  useEffect(() => {
    if (status !== "success") {
      return;
    }

    const redirectTimer = window.setTimeout(() => {
      window.location.replace("/");
    }, 250);

    return () => window.clearTimeout(redirectTimer);
  }, [status]);

  const isProcessing = status === "loading" || status === "success";

  return (
    <div className="flex flex-1 flex-col px-4 py-20">
      <div className="flex flex-1 items-center justify-center">
        {isProcessing ? <Spinner label="Finalizujemy logowanie..." /> : null}
        {status === "error" && error ? (
          <AuthCallbackError
            title={error.title}
            message={error.message}
            actionHref="/login"
            actionLabel="Wróć do logowania"
          />
        ) : null}
      </div>
    </div>
  );
}

export default createRootPage(AuthCallbackPage);
