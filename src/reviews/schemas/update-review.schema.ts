import { z } from 'zod';

export const UpdateReviewSchema = z
  .object({
    rating: z.number().int().min(1).max(5).optional(),
    comment: z.string().min(3).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export type UpdateReviewDto = z.infer<typeof UpdateReviewSchema>;
