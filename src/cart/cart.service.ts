import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../logger/logger.service';
import { AddToCartDto } from './schemas/add-to-cart.schema';
import { UpdateCartItemDto } from './schemas/update-cart.schema';

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  // ─── Helper: get or create cart ──────────────────────────────
  private async getOrCreateCart(userId: number) {
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
      });
      this.logger.log(`Cart created for user: ${userId}`, 'CartService');
    }

    return cart;
  }

  // ─── Helper: format cart response ────────────────────────────
  private async getCartWithDetails(userId: number) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { where: { isPrimary: true }, take: 1 },
                category: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!cart) return { items: [], totalItems: 0, totalPrice: 0 };

    const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.items.reduce(
      (sum, item) => sum + Number(item.product.price) * item.quantity,
      0,
    );

    return { ...cart, totalItems, totalPrice };
  }

  // ─── Get Cart ─────────────────────────────────────────────────
  async getCart(userId: number) {
    this.logger.log(`Getting cart for user: ${userId}`, 'CartService');
    return this.getCartWithDetails(userId);
  }

  // ─── Add to Cart ──────────────────────────────────────────────
  async addToCart(userId: number, dto: AddToCartDto) {
    this.logger.log(`Adding to cart for user: ${userId}`, 'CartService');

    // Cek produk ada dan aktif
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) throw new NotFoundException('Product not found');
    if (!product.isActive)
      throw new BadRequestException('Product is not available');

    // Cek stok
    if (product.stock < dto.quantity) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${product.stock}`,
      );
    }

    const cart = await this.getOrCreateCart(userId);

    // Cek apakah produk sudah ada di cart
    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: { cartId: cart.id, productId: dto.productId },
      },
    });

    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.quantity + dto.quantity;

      if (product.stock < newQuantity) {
        throw new BadRequestException(
          `Insufficient stock. Available: ${product.stock}, in cart: ${existingItem.quantity}`,
        );
      }

      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
      });

      this.logger.log(
        `Cart item quantity updated for user: ${userId}`,
        'CartService',
      );
    } else {
      // Tambah item baru
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: dto.productId,
          quantity: dto.quantity,
        },
      });

      this.logger.log(
        `New item added to cart for user: ${userId}`,
        'CartService',
      );
    }

    return this.getCartWithDetails(userId);
  }

  // ─── Update Cart Item ─────────────────────────────────────────
  async updateCartItem(userId: number, itemId: number, dto: UpdateCartItemDto) {
    this.logger.log(
      `Updating cart item ${itemId} for user: ${userId}`,
      'CartService',
    );

    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) throw new NotFoundException('Cart not found');

    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
      include: { product: true },
    });

    if (!item) throw new NotFoundException('Cart item not found');

    // Cek stok
    if (item.product.stock < dto.quantity) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${item.product.stock}`,
      );
    }

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: dto.quantity },
    });

    this.logger.log(`Cart item updated for user: ${userId}`, 'CartService');
    return this.getCartWithDetails(userId);
  }

  // ─── Remove Cart Item ─────────────────────────────────────────
  async removeCartItem(userId: number, itemId: number) {
    this.logger.log(
      `Removing cart item ${itemId} for user: ${userId}`,
      'CartService',
    );

    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) throw new NotFoundException('Cart not found');

    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });

    if (!item) throw new NotFoundException('Cart item not found');

    await this.prisma.cartItem.delete({ where: { id: itemId } });

    this.logger.log(`Cart item removed for user: ${userId}`, 'CartService');
    return this.getCartWithDetails(userId);
  }

  // ─── Clear Cart ───────────────────────────────────────────────
  async clearCart(userId: number) {
    this.logger.log(`Clearing cart for user: ${userId}`, 'CartService');

    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) throw new NotFoundException('Cart not found');

    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    this.logger.log(`Cart cleared for user: ${userId}`, 'CartService');
    return { message: 'Cart cleared successfully' };
  }
}
