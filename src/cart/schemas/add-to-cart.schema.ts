import { z } from 'zod';

export const AddToCartSchema = z.object({
  productId: z.number({ error: 'Product ID is required' }),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').default(1),
});

export type AddToCartDto = z.infer<typeof AddToCartSchema>;
