import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../logger/logger.service';
import { CreateCouponDto } from './schemas/create-coupon.schema';

@Injectable()
export class CouponsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async create(dto: CreateCouponDto) {
    const existing = await this.prisma.coupon.findUnique({
      where: { code: dto.code },
    });
    if (existing) throw new ConflictException('Coupon code already exists');

    return this.prisma.coupon.create({
      data: {
        ...dto,
        expiredAt: new Date(dto.expiredAt),
      },
    });
  }

  async findAll() {
    return this.prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async validateAndCalculate(code: string, transactionAmount: number) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code },
    });

    if (!coupon) {
      throw new NotFoundException('Kupon tidak ditemukan atau tidak valid');
    }

    if (!coupon.isActive) {
      throw new BadRequestException('Kupon tidak aktif');
    }

    if (new Date(coupon.expiredAt) < new Date()) {
      throw new BadRequestException('Kupon sudah kedaluwarsa');
    }

    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
      throw new BadRequestException('Kuota kupon sudah habis');
    }

    if (coupon.minTransaction && transactionAmount < coupon.minTransaction) {
      throw new BadRequestException(
        `Total transaksi tidak memenuhi syarat minimal (Min. Rp ${coupon.minTransaction})`,
      );
    }

    let discountAmount = 0;
    if (coupon.discountType === 'FIXED_AMOUNT') {
      discountAmount = coupon.discountValue;
    } else if (coupon.discountType === 'PERCENTAGE') {
      discountAmount = transactionAmount * (coupon.discountValue / 100);
    }

    // Ensure discount doesn't exceed transaction amount
    discountAmount = Math.min(discountAmount, transactionAmount);

    return {
      coupon,
      discountAmount,
    };
  }

  async consumeCoupon(tx: any, couponId: number) {
    await tx.coupon.update({
      where: { id: couponId },
      data: { usageCount: { increment: 1 } },
    });
  }
}
