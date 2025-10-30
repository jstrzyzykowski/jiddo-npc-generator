import { z } from "zod";

const deleteNpcReasonSchema = z.string().trim().max(255, { message: "Reason must be at most 255 characters long." });

export const deleteNpcSchema = z.object({
  reason: deleteNpcReasonSchema.optional().transform((value) => {
    if (typeof value !== "string") {
      return undefined;
    }

    return value.length > 0 ? value : undefined;
  }),
});

export type DeleteNpcFormValues = z.infer<typeof deleteNpcSchema>;
