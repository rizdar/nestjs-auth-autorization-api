import { z } from 'zod';

export const CreatePaymentSchema = z.object({
  method: z.enum(['BANK_TRANSFER', 'EWALLET', 'COD']),
});

export type CreatePaymentDto = z.infer<typeof CreatePaymentSchema>;
