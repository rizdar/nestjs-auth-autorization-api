import { z } from 'zod';

export const ResendVerificationSchema = z.object({
  email: z.string().email('Invalid email format'),
});

export type ResendVerificationDto = z.infer<typeof ResendVerificationSchema>;
