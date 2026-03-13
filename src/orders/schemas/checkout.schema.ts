import { z } from 'zod';

export const CheckoutSchema = z.object({
  addressId: z.number({ error: 'Address is required' }),
  notes: z.string().optional(),
});

export type CheckoutDto = z.infer<typeof CheckoutSchema>;
