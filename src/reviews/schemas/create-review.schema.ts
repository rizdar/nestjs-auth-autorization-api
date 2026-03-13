import { z } from 'zod';

export const CreateReviewSchema = z.object({
  productId: z.number({ error: 'Product ID is required' }),
  orderId: z.number({ error: 'Order ID is required' }),
  rating: z
    .number()
    .int()
    .min(1, 'Rating minimum 1')
    .max(5, 'Rating maximum 5'),
  comment: z
    .string()
    .min(3, 'Comment must be at least 3 characters')
    .optional(),
});

export type CreateReviewDto = z.infer<typeof CreateReviewSchema>;
