"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

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
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl">Sign In</CardTitle>
        <CardDescription>Enter your email to receive a login link.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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
            <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)} noValidate>
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
        <CardFooter className="flex flex-col items-start gap-2 text-xs text-muted-foreground">
          <p>We&apos;ll email you a secure login link. No password required.</p>
        </CardFooter>
      ) : null}
    </Card>
  );
}
