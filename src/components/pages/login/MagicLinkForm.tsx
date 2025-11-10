"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import logoSignet from "@/assets/images/comment.png";

import { supabaseClient } from "@/db/supabase.client";
import { MagicLinkFormSchema, type MagicFormViewModel } from "@/lib/validators/authValidators";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const LOG_PREFIX = "MagicLinkForm";
const DEFAULT_REDIRECT_PATH = "/auth/callback";

export function MagicLinkForm() {
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<MagicFormViewModel>({
    resolver: zodResolver(MagicLinkFormSchema),
    defaultValues: { email: "" },
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const redirectTo = useMemo(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    return `${window.location.origin}${DEFAULT_REDIRECT_PATH}`;
  }, []);

  const handleSubmit = async (values: MagicFormViewModel) => {
    try {
      const { error } = await supabaseClient.auth.signInWithOtp({
        email: values.email,
        options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
      });

      if (error) {
        throw error;
      }

      setIsSubmitted(true);
    } catch (error) {
      console.error(`${LOG_PREFIX}: signInWithOtp`, error);
      toast.error("An error occurred while sending the link. Please try again.");
    }
  };

  const { isSubmitting } = form.formState;

  return (
    <Card>
      <CardHeader className="space-y-6 text-center">
        <div className="inline-flex items-center justify-center gap-2 font-semibold tracking-tight text-foreground">
          <img src={logoSignet.src} alt="Jiddo logo" className="h-8 w-auto" />
          <span className="inline-flex items-center text-xl">
            <span className="font-thin">Jiddo</span>
            <span className="font-black">NPC</span>
          </span>
        </div>
        <div className="space-y-1.5">
          <CardTitle className="text-xl font-bold">Log In with Magic Link</CardTitle>
          <CardDescription>Welcome back! Enter your email to receive a login link.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {isSubmitted ? (
          <Alert className="bg-muted/40 animate-slide-up">
            <Mail className="size-5" aria-hidden="true" />
            <AlertTitle>Check your email for a special login link</AlertTitle>
            <AlertDescription>
              <p>Be sure to check your spam or promotions folder if you don&apos;t see it in your inbox.</p>
            </AlertDescription>
          </Alert>
        ) : (
          <Form {...form}>
            <form className="space-y-6" onSubmit={form.handleSubmit(handleSubmit)} noValidate>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email address</FormLabel>
                    <FormControl>
                      <Input type="email" autoComplete="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Sending...
                  </span>
                ) : (
                  "Send magic link"
                )}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
      {!isSubmitted ? (
        <CardFooter className="flex flex-col items-center text-xs text-muted-foreground">
          <p>We&apos;ll email you a secure login link. No password required.</p>
        </CardFooter>
      ) : null}
    </Card>
  );
}
