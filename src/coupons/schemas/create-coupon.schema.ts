import { z } from 'zod';
import { DiscountType } from '../../../generated/prisma/client';

export const CreateCouponSchema = z.object({
  code: z.string().min(3, 'Code must be at least 3 characters'),
  description: z.string().optional(),
  discountType: z.nativeEnum(DiscountType),
  discountValue: z.number().positive('Discount value must be positive'),
  minTransaction: z.number().min(0).optional().default(0),
  usageLimit: z.number().int().positive().optional(),
  expiredAt: z.string().datetime('Invalid date format, use ISO 8601'),
  isActive: z.boolean().optional().default(true),
});

export type CreateCouponDto = z.infer<typeof CreateCouponSchema>;
