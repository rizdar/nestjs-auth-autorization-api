import { z } from 'zod';

export const ProductQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  categoryId: z.coerce.number().int().optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  isActive: z.coerce.boolean().optional(),
  sortBy: z.enum(['name', 'price', 'createdAt', 'stock']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ProductQueryDto = z.infer<typeof ProductQuerySchema>;
