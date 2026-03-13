import { z } from 'zod';

export const ReviewQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ReviewQueryDto = z.infer<typeof ReviewQuerySchema>;
