import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface AuthCallbackErrorProps {
  title: string;
  message: string;
  actionLabel: string;
  actionHref: string;
}

export function AuthCallbackError({ title, message, actionHref, actionLabel }: AuthCallbackErrorProps) {
  return (
    <div className="flex w-full max-w-lg flex-col items-center justify-center gap-6 text-center">
      <div className="inline-flex size-12 items-center justify-center rounded-full border border-destructive/40 bg-destructive/10 text-destructive">
        <AlertCircle aria-hidden className="size-6" />
        <span className="sr-only">{title}</span>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-balance text-xl">{title}</CardTitle>
          <CardDescription className="text-pretty leading-relaxed text-base text-muted-foreground">
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Jeśli potrzebujesz nowego linku logowania, wróć na stronę logowania i poproś o kolejny mail.
          </p>
        </CardContent>
        <CardFooter className="justify-center">
          <Button asChild variant="outline">
            <a href={actionHref}>{actionLabel}</a>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
