import { z } from "zod";

export const MagicLinkFormSchema = z.object({
  email: z
    .string()
    .min(1, { message: "Adres e-mail jest wymagany." })
    .email({ message: "Proszę podać poprawny adres e-mail." }),
});

export type MagicFormViewModel = z.infer<typeof MagicLinkFormSchema>;
