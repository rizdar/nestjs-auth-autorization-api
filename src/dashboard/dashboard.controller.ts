import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { Role } from '../../generated/prisma/client';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorator/roles-decorator';
import { Auth } from 'src/common/decorator/swagger.decorator';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Auth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get overall statistics - Admin only' })
  @ApiResponse({
    status: 200,
    description: 'Overall stats: users, products, orders, revenue',
  })
  getStats() {
    return this.dashboardService.getStats();
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Get monthly revenue data - Admin only' })
  @ApiQuery({ name: 'year', required: false, example: 2026 })
  @ApiResponse({ status: 200, description: 'Monthly revenue data for chart' })
  getRevenue(
    @Query('year', new DefaultValuePipe(0), ParseIntPipe) year: number,
  ) {
    return this.dashboardService.getRevenue(year || undefined);
  }

  @Get('top-products')
  @ApiOperation({ summary: 'Get top selling products - Admin only' })
  @ApiQuery({ name: 'limit', required: false, example: 5 })
  @ApiResponse({ status: 200, description: 'Top selling products' })
  getTopProducts(
    @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit: number,
  ) {
    return this.dashboardService.getTopProducts(limit);
  }

  @Get('recent-orders')
  @ApiOperation({ summary: 'Get recent orders - Admin only' })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({ status: 200, description: 'Recent orders' })
  getRecentOrders(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.dashboardService.getRecentOrders(limit);
  }

  @Get('recent-users')
  @ApiOperation({ summary: 'Get recently registered users - Admin only' })
  @ApiQuery({ name: 'limit', required: false, example: 5 })
  @ApiResponse({ status: 200, description: 'Recently registered users' })
  getRecentUsers(
    @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit: number,
  ) {
    return this.dashboardService.getRecentUsers(limit);
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Get low stock products - Admin only' })
  @ApiQuery({ name: 'threshold', required: false, example: 5 })
  @ApiResponse({ status: 200, description: 'Low stock products' })
  getLowStockProducts(
    @Query('threshold', new DefaultValuePipe(5), ParseIntPipe)
    threshold: number,
  ) {
    return this.dashboardService.getLowStockProducts(threshold);
  }
}
