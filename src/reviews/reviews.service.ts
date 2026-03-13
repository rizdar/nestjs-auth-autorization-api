import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../logger/logger.service';
import { CreateReviewDto } from './schemas/create-review.schema';
import { UpdateReviewDto } from './schemas/update-review.schema';
import { ReviewQueryDto } from './schemas/review-query.schema';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  // ─── Get Reviews by Product ───────────────────────────────────
  async getProductReviews(productId: number, query: ReviewQueryDto) {
    this.logger.log(
      `Getting reviews for product: ${productId}`,
      'ReviewsService',
    );

    const { page, limit, rating, sortOrder } = query;
    const skip = (page - 1) * limit;

    const where: any = { productId };
    if (rating) where.rating = rating;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: sortOrder },
        include: {
          user: { select: { id: true, name: true } },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    // Hitung rata-rata rating
    const aggregate = await this.prisma.review.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    return {
      data: reviews,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        averageRating: aggregate._avg.rating
          ? Number(aggregate._avg.rating.toFixed(1))
          : 0,
        totalReviews: aggregate._count.rating,
      },
    };
  }

  // ─── Create Review ────────────────────────────────────────────
  async createReview(userId: number, dto: CreateReviewDto) {
    this.logger.log(
      `Creating review for product: ${dto.productId}`,
      'ReviewsService',
    );

    // Cek produk ada
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    // Cek order ada, milik user, dan statusnya DELIVERED
    const order = await this.prisma.order.findFirst({
      where: {
        id: dto.orderId,
        userId,
        status: 'DELIVERED',
        items: { some: { productId: dto.productId } },
      },
    });

    if (!order) {
      throw new BadRequestException(
        'You can only review products from your delivered orders',
      );
    }

    // Cek sudah pernah review produk ini di order yang sama
    const existingReview = await this.prisma.review.findUnique({
      where: {
        userId_productId_orderId: {
          userId,
          productId: dto.productId,
          orderId: dto.orderId,
        },
      },
    });

    if (existingReview) {
      throw new BadRequestException(
        'You have already reviewed this product for this order',
      );
    }

    const review = await this.prisma.review.create({
      data: {
        userId,
        productId: dto.productId,
        orderId: dto.orderId,
        rating: dto.rating,
        comment: dto.comment,
      },
      include: {
        user: { select: { id: true, name: true } },
        product: { select: { id: true, name: true } },
      },
    });

    this.logger.log(`Review created: ${review.id}`, 'ReviewsService');
    return review;
  }

  // ─── Update Review ────────────────────────────────────────────
  async updateReview(userId: number, reviewId: number, dto: UpdateReviewDto) {
    this.logger.log(`Updating review: ${reviewId}`, 'ReviewsService');

    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) throw new NotFoundException('Review not found');
    if (review.userId !== userId) {
      throw new ForbiddenException('You can only edit your own reviews');
    }

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: dto,
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    this.logger.log(`Review updated: ${reviewId}`, 'ReviewsService');
    return updated;
  }

  // ─── Delete Review (user) ─────────────────────────────────────
  async deleteReview(userId: number, reviewId: number) {
    this.logger.log(`Deleting review: ${reviewId}`, 'ReviewsService');

    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) throw new NotFoundException('Review not found');
    if (review.userId !== userId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    await this.prisma.review.delete({ where: { id: reviewId } });

    this.logger.log(`Review deleted: ${reviewId}`, 'ReviewsService');
    return { message: 'Review deleted successfully' };
  }

  // ─── Delete Review (admin) ────────────────────────────────────
  async adminDeleteReview(reviewId: number) {
    this.logger.log(`Admin deleting review: ${reviewId}`, 'ReviewsService');

    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) throw new NotFoundException('Review not found');

    await this.prisma.review.delete({ where: { id: reviewId } });

    this.logger.log(`Review deleted by admin: ${reviewId}`, 'ReviewsService');
    return { message: 'Review deleted successfully' };
  }

  // ─── Get My Reviews ───────────────────────────────────────────
  async getMyReviews(userId: number) {
    this.logger.log(`Getting reviews for user: ${userId}`, 'ReviewsService');

    return this.prisma.review.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: { where: { isPrimary: true }, take: 1 },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
