import {
  Controller,
  Get,
  Post,
  Patch,
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
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { Role } from '../../generated/prisma/client';

import { CheckoutSchema, type CheckoutDto } from './schemas/checkout.schema';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';

import {
  UpdateOrderStatusSchema,
  type UpdateOrderStatusDto,
} from './schemas/update-order.schema';
import { Auth } from 'src/common/decorator/swagger.decorator';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorator/roles-decorator';
import { ZodValidationPipe } from 'nestjs-zod';
@ApiTags('Orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@Auth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ─── User Endpoints ───────────────────────────────────────────
  @Post('checkout')
  @ApiOperation({ summary: 'Checkout from cart' })
  @ApiBody({
    schema: {
      example: {
        addressId: 1,
        couponCode: 'PROMO2024',
        notes: 'Please handle with care',
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 400, description: 'Cart empty / insufficient stock' })
  checkout(
    @CurrentUser() user: { sub: number },
    @Body(new ZodValidationPipe(CheckoutSchema)) dto: CheckoutDto,
  ) {
    return this.ordersService.checkout(user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get my orders' })
  @ApiResponse({ status: 200, description: 'List of user orders' })
  getMyOrders(@CurrentUser() user: { sub: number }) {
    return this.ordersService.getMyOrders(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order detail' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, description: 'Order detail' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  getOrderDetail(
    @CurrentUser() user: { sub: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ordersService.getOrderDetail(user.sub, id);
  }

  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel order (only PENDING orders)' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, description: 'Order cancelled' })
  @ApiResponse({ status: 400, description: 'Order cannot be cancelled' })
  cancelOrder(
    @CurrentUser() user: { sub: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ordersService.cancelOrder(user.sub, id);
  }

  // ─── Admin Endpoints ──────────────────────────────────────────
  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all orders - Admin only' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
  })
  @ApiResponse({ status: 200, description: 'All orders' })
  getAllOrders(@Query('status') status?: string) {
    return this.ordersService.getAllOrders(status);
  }

  @Patch('admin/:id/status')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update order status - Admin only' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiBody({
    schema: {
      example: { status: 'SHIPPED' },
    },
  })
  @ApiResponse({ status: 200, description: 'Order status updated' })
  updateOrderStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(UpdateOrderStatusSchema))
    dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatus(id, dto);
  }
}
