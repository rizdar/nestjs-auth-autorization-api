import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../logger/logger.service';
import { CreateAddressDto } from './schemas/create-address.schema';
import { UpdateAddressDto } from './schemas/update-address.schema';

@Injectable()
export class AddressesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  // ─── Get All User Addresses ───────────────────────────────────
  async findAll(userId: number) {
    this.logger.log(
      `Getting addresses for user: ${userId}`,
      'AddressesService',
    );

    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [
        { isDefault: 'desc' }, // default address tampil pertama
        { createdAt: 'desc' },
      ],
    });
  }

  // ─── Get One ──────────────────────────────────────────────────
  async findOne(userId: number, addressId: number) {
    this.logger.log(
      `Getting address ${addressId} for user: ${userId}`,
      'AddressesService',
    );

    const address = await this.prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!address) throw new NotFoundException('Address not found');
    if (address.userId !== userId)
      throw new ForbiddenException('Access denied');

    return address;
  }

  // ─── Create ───────────────────────────────────────────────────
  async create(userId: number, dto: CreateAddressDto) {
    this.logger.log(`Creating address for user: ${userId}`, 'AddressesService');

    // Kalau isDefault true, reset semua address lain
    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    // Kalau belum ada address sama sekali, jadikan default otomatis
    const addressCount = await this.prisma.address.count({ where: { userId } });
    const shouldBeDefault = dto.isDefault || addressCount === 0;

    const address = await this.prisma.address.create({
      data: { ...dto, userId, isDefault: shouldBeDefault },
    });

    this.logger.log(
      `Address created: ${address.id} for user: ${userId}`,
      'AddressesService',
    );
    return address;
  }

  // ─── Update ───────────────────────────────────────────────────
  async update(userId: number, addressId: number, dto: UpdateAddressDto) {
    this.logger.log(
      `Updating address ${addressId} for user: ${userId}`,
      'AddressesService',
    );

    await this.findOne(userId, addressId);

    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, NOT: { id: addressId } },
        data: { isDefault: false },
      });
    }

    const updated = await this.prisma.address.update({
      where: { id: addressId },
      data: dto,
    });

    this.logger.log(`Address updated: ${addressId}`, 'AddressesService');
    return updated;
  }

  // ─── Set Default ──────────────────────────────────────────────
  async setDefault(userId: number, addressId: number) {
    this.logger.log(
      `Setting default address ${addressId} for user: ${userId}`,
      'AddressesService',
    );

    await this.findOne(userId, addressId);

    // Reset semua, set yang dipilih jadi default
    await this.prisma.$transaction([
      this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      }),
      this.prisma.address.update({
        where: { id: addressId },
        data: { isDefault: true },
      }),
    ]);

    this.logger.log(`Default address set: ${addressId}`, 'AddressesService');
    return { message: 'Default address updated successfully' };
  }

  // ─── Delete ───────────────────────────────────────────────────
  async delete(userId: number, addressId: number) {
    this.logger.log(
      `Deleting address ${addressId} for user: ${userId}`,
      'AddressesService',
    );

    const address = await this.findOne(userId, addressId);

    // Cek apakah address dipakai di order
    const orderCount = await this.prisma.order.count({
      where: { addressId },
    });

    if (orderCount > 0) {
      throw new BadRequestException(
        'Cannot delete address that is used in orders',
      );
    }

    await this.prisma.address.delete({ where: { id: addressId } });

    // Kalau yang dihapus adalah default, set address lain jadi default
    if (address.isDefault) {
      const nextAddress = await this.prisma.address.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      if (nextAddress) {
        await this.prisma.address.update({
          where: { id: nextAddress.id },
          data: { isDefault: true },
        });
      }
    }

    this.logger.log(`Address deleted: ${addressId}`, 'AddressesService');
    return { message: 'Address deleted successfully' };
  }
}
