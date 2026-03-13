import { z } from 'zod';

export const UpdateProductSchema = z
  .object({
    categoryId: z.number().optional(),
    name: z.string().min(2).optional(),
    description: z.string().optional(),
    price: z.number().positive().optional(),
    stock: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export type UpdateProductDto = z.infer<typeof UpdateProductSchema>;
