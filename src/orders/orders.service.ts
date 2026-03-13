import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../logger/logger.service';
import { CheckoutDto } from './schemas/checkout.schema';
import { UpdateOrderStatusDto } from './schemas/update-order.schema';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  // ─── Checkout ─────────────────────────────────────────────────
  async checkout(userId: number, dto: CheckoutDto) {
    this.logger.log(`Checkout for user: ${userId}`, 'OrdersService');

    // Cek address milik user
    const address = await this.prisma.address.findFirst({
      where: { id: dto.addressId, userId },
    });
    if (!address) throw new NotFoundException('Address not found');

    // Ambil cart dengan items
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // Validasi stok semua produk
    for (const item of cart.items) {
      if (!item.product.isActive) {
        throw new BadRequestException(
          `Product "${item.product.name}" is no longer available`,
        );
      }
      if (item.product.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for "${item.product.name}". Available: ${item.product.stock}`,
        );
      }
    }

    // Hitung total
    const totalAmount = cart.items.reduce(
      (sum, item) => sum + Number(item.product.price) * item.quantity,
      0,
    );

    // Buat order dalam satu transaction
    const order = await this.prisma.$transaction(async (tx) => {
      // 1. Buat order
      const newOrder = await tx.order.create({
        data: {
          userId,
          addressId: dto.addressId,
          totalAmount,
          notes: dto.notes,
          items: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.product.price,
            })),
          },
        },
        include: {
          items: { include: { product: true } },
          address: true,
        },
      });

      // 2. Kurangi stok produk
      for (const item of cart.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      // 3. Clear cart
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return newOrder;
    });

    this.logger.log(
      `Order created: ${order.id} for user: ${userId}`,
      'OrdersService',
    );
    return order;
  }

  // ─── Get My Orders ────────────────────────────────────────────
  async getMyOrders(userId: number) {
    this.logger.log(`Getting orders for user: ${userId}`, 'OrdersService');

    return this.prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { where: { isPrimary: true }, take: 1 },
              },
            },
          },
        },
        address: true,
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Get Order Detail ─────────────────────────────────────────
  async getOrderDetail(userId: number, orderId: number) {
    this.logger.log(
      `Getting order ${orderId} for user: ${userId}`,
      'OrdersService',
    );

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { where: { isPrimary: true }, take: 1 },
              },
            },
          },
        },
        address: true,
        payment: true,
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new ForbiddenException('Access denied');

    return order;
  }

  // ─── Cancel Order ─────────────────────────────────────────────
  async cancelOrder(userId: number, orderId: number) {
    this.logger.log(
      `Cancelling order ${orderId} for user: ${userId}`,
      'OrdersService',
    );

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new ForbiddenException('Access denied');
    if (order.status !== 'PENDING') {
      throw new BadRequestException('Only PENDING orders can be cancelled');
    }

    // Cancel + kembalikan stok dalam transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' },
      });

      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    });

    this.logger.log(
      `Order ${orderId} cancelled for user: ${userId}`,
      'OrdersService',
    );
    return { message: 'Order cancelled successfully' };
  }

  // ─── Admin: Get All Orders ────────────────────────────────────
  async getAllOrders(status?: string) {
    this.logger.log('Admin getting all orders', 'OrdersService');

    return this.prisma.order.findMany({
      where: status ? { status: status as any } : {},
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: { include: { product: true } },
        address: true,
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Admin: Update Order Status ───────────────────────────────
  async updateOrderStatus(orderId: number, dto: UpdateOrderStatusDto) {
    this.logger.log(
      `Admin updating order ${orderId} to ${dto.status}`,
      'OrdersService',
    );

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Order not found');

    // Validasi status transition
    const validTransitions: Record<string, string[]> = {
      PENDING: ['PAID', 'CANCELLED'],
      PAID: ['SHIPPED', 'CANCELLED'],
      SHIPPED: ['DELIVERED'],
      DELIVERED: [],
      CANCELLED: [],
    };

    if (!validTransitions[order.status].includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${order.status} to ${dto.status}`,
      );
    }

    // Kalau cancel dari admin, kembalikan stok
    if (dto.status === 'CANCELLED' && order.status !== 'CANCELLED') {
      const items = await this.prisma.orderItem.findMany({
        where: { orderId },
      });

      await this.prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: orderId },
          data: { status: 'CANCELLED' },
        });
        for (const item of items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      });
    } else {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: dto.status as any },
      });
    }

    this.logger.log(
      `Order ${orderId} status updated to ${dto.status}`,
      'OrdersService',
    );
    return { message: `Order status updated to ${dto.status}` };
  }
}
