import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../logger/logger.service';
import { CreatePaymentDto } from './schemas/create-payment.schema';
import {
  PAYMENT_PROVIDER,
  type PaymentProvider,
} from './providers/payment-provider.interfaces';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    @Inject(PAYMENT_PROVIDER) private readonly paymentProvider: PaymentProvider,
  ) {}

  // ─── Pay Order ────────────────────────────────────────────────
  async payOrder(userId: number, orderId: number, dto: CreatePaymentDto) {
    this.logger.log(`Payment attempt for order: ${orderId}`, 'PaymentsService');

    // Cek order ada dan milik user
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new ForbiddenException('Access denied');
    if (order.status !== 'PENDING') {
      throw new BadRequestException(
        `Order is already ${order.status}. Only PENDING orders can be paid.`,
      );
    }
    if (order.payment) {
      throw new BadRequestException('Payment already exists for this order');
    }

    // COD langsung success tanpa proses
    if (dto.method === 'COD') {
      return this.processCOD(orderId, Number(order.totalAmount));
    }

    // Proses pembayaran via provider
    return this.processOnlinePayment(
      orderId,
      Number(order.totalAmount),
      dto.method,
    );
  }

  // ─── COD Handler ──────────────────────────────────────────────
  private async processCOD(orderId: number, amount: number) {
    this.logger.log(`Processing COD for order: ${orderId}`, 'PaymentsService');

    const payment = await this.prisma.$transaction(async (tx) => {
      const newPayment = await tx.payment.create({
        data: {
          orderId,
          method: 'COD',
          status: 'SUCCESS',
          amount,
          paidAt: new Date(),
        },
      });

      await tx.order.update({
        where: { id: orderId },
        data: { status: 'PAID' },
      });

      return newPayment;
    });

    this.logger.log(
      `COD payment successful for order: ${orderId}`,
      'PaymentsService',
    );
    return {
      payment,
      message:
        'COD order confirmed. Please prepare the payment when the order arrives.',
    };
  }

  // ─── Online Payment Handler ───────────────────────────────────
  private async processOnlinePayment(
    orderId: number,
    amount: number,
    method: 'BANK_TRANSFER' | 'EWALLET',
  ) {
    this.logger.log(
      `Processing ${method} for order: ${orderId}`,
      'PaymentsService',
    );

    // Buat payment record dengan status PENDING dulu
    const payment = await this.prisma.payment.create({
      data: { orderId, method, status: 'PENDING', amount },
    });

    try {
      // Proses via provider (simulation / midtrans / dll)
      const result = await this.paymentProvider.processPayment(orderId, amount);

      if (result.success) {
        // Update payment & order dalam transaction
        const updatedPayment = await this.prisma.$transaction(async (tx) => {
          const updated = await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: 'SUCCESS',
              paidAt: new Date(),
            },
          });

          await tx.order.update({
            where: { id: orderId },
            data: { status: 'PAID' },
          });

          return updated;
        });

        this.logger.log(
          `Payment successful for order: ${orderId}`,
          'PaymentsService',
        );
        return {
          payment: updatedPayment,
          transactionId: result.transactionId,
          message: result.message,
        };
      } else {
        // Payment gagal
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'FAILED' },
        });

        this.logger.warn(
          `Payment failed for order: ${orderId}`,
          'PaymentsService',
        );
        throw new BadRequestException(result.message);
      }
    } catch (error) {
      // Kalau ada error tidak terduga
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      });
      throw error;
    }
  }

  // ─── Get Payment by Order ─────────────────────────────────────
  async getPaymentByOrder(userId: number, orderId: number) {
    this.logger.log(`Getting payment for order: ${orderId}`, 'PaymentsService');

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new ForbiddenException('Access denied');

    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
    });

    if (!payment)
      throw new NotFoundException('Payment not found for this order');
    return payment;
  }

  // ─── Admin: Get All Payments ──────────────────────────────────
  async getAllPayments(status?: string) {
    this.logger.log('Admin getting all payments', 'PaymentsService');

    return this.prisma.payment.findMany({
      where: status ? { status: status as any } : {},
      include: {
        order: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
