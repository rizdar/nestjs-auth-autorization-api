import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { Role } from '../../generated/prisma/client';
import { ZodValidationPipe } from 'nestjs-zod';
import { Auth } from '../common/decorator/swagger.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { CouponsService } from './coupons.service';
import { CreateCouponSchema, type CreateCouponDto } from './schemas/create-coupon.schema';
import { ValidateCouponSchema, type ValidateCouponDto } from './schemas/validate-coupon.schema';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/role.guard';
import { Roles } from '../common/decorator/roles-decorator';

@ApiTags('Coupons')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Auth()
  @ApiOperation({ summary: 'Create a new coupon - Admin only' })
  @ApiBody({
    schema: {
      example: {
        code: 'PROMO2024',
        description: 'Diskon Spesial Libur Tahun Baru',
        discountType: 'PERCENTAGE',
        discountValue: 15,
        minTransaction: 100000,
        usageLimit: 50,
        expiredAt: '2026-12-31T23:59:59Z',
        isActive: true,
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Coupon created successfully' })
  create(@Body(new ZodValidationPipe(CreateCouponSchema)) dto: CreateCouponDto) {
    return this.couponsService.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Auth()
  @ApiOperation({ summary: 'Get all coupons - Admin only' })
  @ApiResponse({ status: 200, description: 'List of all coupons' })
  findAll() {
    return this.couponsService.findAll();
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate a coupon code' })
  @ApiBody({
    schema: {
      example: {
        code: 'PROMO2024',
        transactionAmount: 150000,
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Coupon is valid, returns discount amount' })
  @ApiResponse({ status: 404, description: 'Coupon not found' })
  @ApiResponse({ status: 400, description: 'Coupon is invalid or expired' })
  validate(@Body(new ZodValidationPipe(ValidateCouponSchema)) dto: ValidateCouponDto) {
    return this.couponsService.validateAndCalculate(dto.code, dto.transactionAmount);
  }
}
