import { z } from 'zod';

export const CheckoutSchema = z.object({
  addressId: z.number({ error: 'Address is required' }),
  couponCode: z.string().optional(),
  notes: z.string().optional(),
});

export type CheckoutDto = z.infer<typeof CheckoutSchema>;
