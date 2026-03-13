import { z } from 'zod';

export const UpdateCategorySchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    description: z.string().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export type UpdateCategoryDto = z.infer<typeof UpdateCategorySchema>;
