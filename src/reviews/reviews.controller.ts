import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { Role } from '../../generated/prisma/client';
import {
  type ReviewQueryDto,
  ReviewQuerySchema,
} from './schemas/review-query.schema';
import { Auth } from 'src/common/decorator/swagger.decorator';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import {
  type CreateReviewDto,
  CreateReviewSchema,
} from './schemas/create-review.schema';
import {
  type UpdateReviewDto,
  UpdateReviewSchema,
} from './schemas/update-review.schema';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorator/roles-decorator';
import { ZodValidationPipe } from 'nestjs-zod';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // ─── Public ───────────────────────────────────────────────────
  @Get('product/:productId')
  @ApiOperation({ summary: 'Get reviews by product' })
  @ApiParam({ name: 'productId', example: 1 })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'rating', required: false, example: 5 })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({ status: 200, description: 'Product reviews' })
  getProductReviews(
    @Param('productId', ParseIntPipe) productId: number,
    @Query() query: ReviewQueryDto,
  ) {
    const parsed = ReviewQuerySchema.parse(query);
    return this.reviewsService.getProductReviews(productId, parsed);
  }

  // ─── Protected ────────────────────────────────────────────────
  @Get('my-reviews')
  @UseGuards(JwtAuthGuard)
  @Auth()
  @ApiOperation({ summary: 'Get my reviews' })
  @ApiResponse({ status: 200, description: 'My reviews' })
  getMyReviews(@CurrentUser() user: { sub: number }) {
    return this.reviewsService.getMyReviews(user.sub);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @Auth()
  @ApiOperation({ summary: 'Create a review' })
  @ApiBody({
    schema: {
      example: {
        productId: 1,
        orderId: 1,
        rating: 5,
        comment: 'Great product! Highly recommended.',
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Review created' })
  @ApiResponse({
    status: 400,
    description: 'Order not delivered / Already reviewed',
  })
  createReview(
    @CurrentUser() user: { sub: number },
    @Body(new ZodValidationPipe(CreateReviewSchema)) dto: CreateReviewDto,
  ) {
    return this.reviewsService.createReview(user.sub, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @Auth()
  @ApiOperation({ summary: 'Update my review' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiBody({
    schema: {
      example: {
        rating: 4,
        comment: 'Updated review comment',
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Review updated' })
  @ApiResponse({ status: 403, description: 'Not your review' })
  updateReview(
    @CurrentUser() user: { sub: number },
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(UpdateReviewSchema)) dto: UpdateReviewDto,
  ) {
    return this.reviewsService.updateReview(user.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @Auth()
  @ApiOperation({ summary: 'Delete my review' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, description: 'Review deleted' })
  @ApiResponse({ status: 403, description: 'Not your review' })
  deleteReview(
    @CurrentUser() user: { sub: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.reviewsService.deleteReview(user.sub, id);
  }

  // ─── Admin ────────────────────────────────────────────────────
  @Delete('admin/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Auth()
  @ApiOperation({ summary: 'Delete any review - Admin only' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, description: 'Review deleted' })
  adminDeleteReview(@Param('id', ParseIntPipe) id: number) {
    return this.reviewsService.adminDeleteReview(id);
  }
}
