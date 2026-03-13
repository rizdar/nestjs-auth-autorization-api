import { z } from 'zod';

export const CreateCategorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
});

export type CreateCategoryDto = z.infer<typeof CreateCategorySchema>;
