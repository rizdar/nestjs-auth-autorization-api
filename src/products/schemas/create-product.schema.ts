import { z } from 'zod';

export const CreateProductSchema = z.object({
  categoryId: z.number({ error: 'Category is required' }),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  price: z.number().positive('Price must be greater than 0'),
  stock: z.number().int().min(0, 'Stock cannot be negative').default(0),
  isActive: z.boolean().default(true),
});

export type CreateProductDto = z.infer<typeof CreateProductSchema>;
