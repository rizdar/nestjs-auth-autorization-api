import { z } from 'zod';

export const ValidateCouponSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  transactionAmount: z.number().min(0, 'Transaction amount must be positive'),
});

export type ValidateCouponDto = z.infer<typeof ValidateCouponSchema>;
