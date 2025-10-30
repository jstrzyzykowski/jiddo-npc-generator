import { useCallback } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

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
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { deleteNpcSchema, type DeleteNpcFormValues } from "@/lib/validators/npc";

export interface DeleteNpcModalProps {
  isOpen: boolean;
  onClose: () => void;
  npcId: string;
  npcName: string;
  onSuccess: () => Promise<void> | void;
}

const LOG_PREFIX = "DeleteNpcModal";

const DeleteNpcModal = ({ isOpen, onClose, npcId, onSuccess }: DeleteNpcModalProps) => {
  const form = useForm<DeleteNpcFormValues>({
    resolver: zodResolver(deleteNpcSchema),
    defaultValues: {
      reason: "",
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const { isSubmitting } = form.formState;

  const resetAndClose = useCallback(() => {
    form.reset({ reason: "" });
    onClose();
  }, [form, onClose]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetAndClose();
    }
  };

  const handleSubmit = async (values: DeleteNpcFormValues) => {
    if (!npcId) {
      toast.error("NPC ID is required.");
      return;
    }

    const payload = values.reason ? { reason: values.reason } : undefined;

    try {
      const response = await fetch(`/api/npcs/${npcId}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          ...(payload ? { "Content-Type": "application/json" } : {}),
        },
        body: payload ? JSON.stringify(payload) : undefined,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const message = errorBody?.error?.message ?? "Failed to delete NPC.";
        throw new Error(message);
      }

      toast.success("NPC has been deleted successfully.");
      await onSuccess();
      resetAndClose();
    } catch (error) {
      console.error(`${LOG_PREFIX}: delete`, error);
      const message = error instanceof Error ? error.message : "Failed to delete NPC.";
      toast.error(message);
      return;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete NPC</DialogTitle>
          <DialogDescription>
            {`This action cannot be undone. This will permanently delete the NPC and all associated modules information.`}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-6" onSubmit={form.handleSubmit(handleSubmit)} noValidate>
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Reason for deletion..."
                      rows={4}
                      spellCheck={false}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetAndClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" variant="default" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Spinner className="size-4" />
                    Deleting...
                  </span>
                ) : (
                  "Delete"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteNpcModal;
