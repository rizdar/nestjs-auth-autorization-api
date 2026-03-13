import {
  Controller,
  Get,
  Post,
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
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { Role } from '../../generated/prisma/client';

import {
  CreatePaymentSchema,
  type CreatePaymentDto,
} from './schemas/create-payment.schema';
import { Auth } from 'src/common/decorator/swagger.decorator';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { ZodValidationPipe } from 'nestjs-zod';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorator/roles-decorator';

@ApiTags('Payments')
@Controller('payments')
@UseGuards(JwtAuthGuard)
@Auth()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post(':orderId/pay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pay an order' })
  @ApiParam({ name: 'orderId', example: 1 })
  @ApiBody({
    schema: {
      example: { method: 'BANK_TRANSFER' },
    },
  })
  @ApiResponse({ status: 200, description: 'Payment processed' })
  @ApiResponse({
    status: 400,
    description: 'Payment failed / Order not PENDING',
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  payOrder(
    @CurrentUser() user: { sub: number },
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body(new ZodValidationPipe(CreatePaymentSchema)) dto: CreatePaymentDto,
  ) {
    return this.paymentsService.payOrder(user.sub, orderId, dto);
  }

  @Get(':orderId')
  @ApiOperation({ summary: 'Get payment detail by order' })
  @ApiParam({ name: 'orderId', example: 1 })
  @ApiResponse({ status: 200, description: 'Payment detail' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  getPaymentByOrder(
    @CurrentUser() user: { sub: number },
    @Param('orderId', ParseIntPipe) orderId: number,
  ) {
    return this.paymentsService.getPaymentByOrder(user.sub, orderId);
  }

  // ─── Admin ────────────────────────────────────────────────────
  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all payments - Admin only' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'SUCCESS', 'FAILED'],
  })
  @ApiResponse({ status: 200, description: 'All payments' })
  getAllPayments(@Query('status') status?: string) {
    return this.paymentsService.getAllPayments(status);
  }
}
