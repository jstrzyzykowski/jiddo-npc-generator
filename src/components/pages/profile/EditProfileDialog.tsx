import { useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";

const Schema = z.object({
  displayName: z
    .string()
    .trim()
    .min(3, "Display name must be at least 3 characters long")
    .max(50, "Display name can be at most 50 characters long")
    .regex(/.*[a-zA-Z].*/, "Display name must contain at least one letter"),
  bio: z.string().max(250, "Max 250 characters").optional(),
});

export type EditProfileFormValues = z.infer<typeof Schema>;

interface EditProfileDialogProps {
  open: boolean;
  initialName: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: EditProfileFormValues) => Promise<void> | void;
}

export function EditProfileDialog({ open, initialName, onOpenChange, onSubmit }: EditProfileDialogProps) {
  const form = useForm<EditProfileFormValues>({
    resolver: zodResolver(Schema),
    defaultValues: { displayName: initialName, bio: "" },
    mode: "onChange",
  });

  useEffect(() => {
    if (open) {
      form.reset({ displayName: initialName, bio: "" });
    }
  }, [open, initialName, form]);

  const initials = getInitials(initialName);
  const isDirty = form.formState.isDirty;
  const isSubmitting = form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Profile Information</DialogTitle>
          <DialogDescription>Update how your profile appears to others.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(async (values) => {
              await onSubmit(values);
            })}
            className="flex flex-col gap-6"
          >
            <div className="flex items-center gap-4">
              <Avatar className="size-14">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium">Photo</span>
                <span className="text-xs text-muted-foreground">Avatar editing coming soon</span>
              </div>
            </div>

            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your public name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Optional bio (not saved yet)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!isDirty || isSubmitting} aria-busy={isSubmitting}>
                Save
                {isSubmitting ? <Spinner className="ms-1 size-4" /> : null}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
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
