import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  // ─── Overall Stats ────────────────────────────────────────────
  async getStats() {
    this.logger.log('Getting dashboard stats', 'DashboardService');

    const [
      totalUsers,
      totalProducts,
      totalOrders,
      totalRevenue,
      pendingOrders,
      lowStockProducts,
    ] = await Promise.all([
      // Total users
      this.prisma.user.count(),

      // Total active products
      this.prisma.product.count({ where: { isActive: true } }),

      // Total orders
      this.prisma.order.count(),

      // Total revenue (dari payment SUCCESS)
      this.prisma.payment.aggregate({
        where: { status: 'SUCCESS' },
        _sum: { amount: true },
      }),

      // Pending orders
      this.prisma.order.count({ where: { status: 'PENDING' } }),

      // Low stock products (stok <= 5)
      this.prisma.product.count({
        where: { stock: { lte: 5 }, isActive: true },
      }),
    ]);

    // Order stats per status
    const ordersByStatus = await this.prisma.order.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    const orderStatusMap = ordersByStatus.reduce(
      (acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      users: {
        total: totalUsers,
      },
      products: {
        total: totalProducts,
        lowStock: lowStockProducts,
      },
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        byStatus: {
          PENDING: orderStatusMap['PENDING'] || 0,
          PAID: orderStatusMap['PAID'] || 0,
          SHIPPED: orderStatusMap['SHIPPED'] || 0,
          DELIVERED: orderStatusMap['DELIVERED'] || 0,
          CANCELLED: orderStatusMap['CANCELLED'] || 0,
        },
      },
      revenue: {
        total: Number(totalRevenue._sum.amount || 0),
      },
    };
  }

  // ─── Revenue per Month ────────────────────────────────────────
  async getRevenue(year?: number) {
    this.logger.log('Getting revenue data', 'DashboardService');

    const targetYear = year || new Date().getFullYear();

    const startDate = new Date(`${targetYear}-01-01`);
    const endDate = new Date(`${targetYear}-12-31T23:59:59`);

    const payments = await this.prisma.payment.findMany({
      where: {
        status: 'SUCCESS',
        paidAt: { gte: startDate, lte: endDate },
      },
      select: { amount: true, paidAt: true },
    });

    // Group by month
    const monthlyRevenue = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      monthName: new Date(targetYear, i, 1).toLocaleString('default', {
        month: 'long',
      }),
      revenue: 0,
      totalOrders: 0,
    }));

    payments.forEach((payment) => {
      if (payment.paidAt) {
        const month = payment.paidAt.getMonth(); // 0-indexed
        monthlyRevenue[month].revenue += Number(payment.amount);
        monthlyRevenue[month].totalOrders += 1;
      }
    });

    const totalRevenue = monthlyRevenue.reduce((sum, m) => sum + m.revenue, 0);

    return {
      year: targetYear,
      totalRevenue,
      monthly: monthlyRevenue,
    };
  }

  // ─── Top Products ─────────────────────────────────────────────
  async getTopProducts(limit: number = 5) {
    this.logger.log('Getting top products', 'DashboardService');

    const topProducts = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      _count: { orderId: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    });

    // Ambil detail produk
    const productIds = topProducts.map((p) => p.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        category: { select: { name: true } },
      },
    });

    // Gabungkan data
    const result = topProducts.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      return {
        product,
        totalSold: item._sum.quantity || 0,
        totalOrders: item._count.orderId,
      };
    });

    return result;
  }

  // ─── Recent Orders ────────────────────────────────────────────
  async getRecentOrders(limit: number = 10) {
    this.logger.log('Getting recent orders', 'DashboardService');

    return this.prisma.order.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: { select: { quantity: true, price: true } },
        payment: { select: { method: true, status: true } },
      },
    });
  }

  // ─── Recent Registered Users ──────────────────────────────────
  async getRecentUsers(limit: number = 5) {
    this.logger.log('Getting recent users', 'DashboardService');

    return this.prisma.user.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isEmailVerified: true,
        createdAt: true,
      },
    });
  }

  // ─── Low Stock Products ───────────────────────────────────────
  async getLowStockProducts(threshold: number = 5) {
    this.logger.log('Getting low stock products', 'DashboardService');

    return this.prisma.product.findMany({
      where: {
        stock: { lte: threshold },
        isActive: true,
      },
      include: {
        category: { select: { name: true } },
        images: { where: { isPrimary: true }, take: 1 },
      },
      orderBy: { stock: 'asc' },
    });
  }
}
