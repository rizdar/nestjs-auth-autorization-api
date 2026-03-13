import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../logger/logger.service';
import { ImageService } from '../common/services/image.service';
import { CreateProductDto } from './schemas/create-product.schema';
import { UpdateProductDto } from './schemas/update-product.schema';
import { ProductQueryDto } from './schemas/product-query.schema';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly imageService: ImageService,
  ) {}

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  // ─── Get All (dengan pagination & filter) ────────────────────
  async findAll(query: ProductQueryDto) {
    const {
      page,
      limit,
      search,
      categoryId,
      minPrice,
      maxPrice,
      isActive,
      sortBy,
      sortOrder,
    } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) where.categoryId = categoryId;
    if (isActive !== undefined) where.isActive = isActive;
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = minPrice;
      if (maxPrice) where.price.lte = maxPrice;
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          images: { where: { isPrimary: true }, take: 1 },
          //   _count: { select: { reviews: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─── Get One by Slug ─────────────────────────────────────────
  async findBySlug(slug: string) {
    this.logger.log(`Fetching product: ${slug}`, 'ProductsService');

    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: { orderBy: { isPrimary: 'desc' } },
        // _count: { select: { reviews: true } },
      },
    });

    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  // ─── Get One by ID ────────────────────────────────────────────
  async findById(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { images: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  // ─── Create ───────────────────────────────────────────────────
  async create(dto: CreateProductDto) {
    this.logger.log(`Creating product: ${dto.name}`, 'ProductsService');

    const slug = this.generateSlug(dto.name);

    const existing = await this.prisma.product.findUnique({ where: { slug } });
    if (existing)
      throw new ConflictException('Product with this name already exists');

    // Cek category exists
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) throw new NotFoundException('Category not found');

    const product = await this.prisma.product.create({
      data: { ...dto, slug, price: dto.price },
      include: { category: true },
    });

    this.logger.log(`Product created: ${product.id}`, 'ProductsService');
    return product;
  }

  // ─── Update ───────────────────────────────────────────────────
  async update(id: number, dto: UpdateProductDto) {
    this.logger.log(`Updating product: ${id}`, 'ProductsService');

    await this.findById(id);

    const data: any = { ...dto };

    if (dto.name) {
      const slug = this.generateSlug(dto.name);
      const existing = await this.prisma.product.findFirst({
        where: { slug, NOT: { id } },
      });
      if (existing)
        throw new ConflictException('Product with this name already exists');
      data.slug = slug;
    }

    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) throw new NotFoundException('Category not found');
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data,
      include: { category: true, images: true },
    });

    this.logger.log(`Product updated: ${id}`, 'ProductsService');
    return updated;
  }

  // ─── Delete ───────────────────────────────────────────────────
  async delete(id: number) {
    this.logger.log(`Deleting product: ${id}`, 'ProductsService');

    const product = await this.findById(id);

    // Hapus semua gambar dari disk
    for (const image of product.images) {
      this.imageService.deleteImage(image.url);
    }

    await this.prisma.product.delete({ where: { id } });

    this.logger.log(`Product deleted: ${id}`, 'ProductsService');
    return { message: 'Product deleted successfully' };
  }

  // ─── Upload Image ─────────────────────────────────────────────
  async uploadImage(
    productId: number,
    file: Express.Multer.File,
    isPrimary: boolean = false,
  ) {
    this.logger.log(
      `Uploading image for product: ${productId}`,
      'ProductsService',
    );

    const product = await this.findById(productId);

    // Process & compress image
    const processedPath = await this.imageService.processProductImage(
      file.path,
    );
    const imageUrl = processedPath.replace(/\\/g, '/');

    // Kalau isPrimary, reset semua gambar lain
    if (isPrimary) {
      await this.prisma.productImage.updateMany({
        where: { productId },
        data: { isPrimary: false },
      });
    }

    // Kalau belum ada gambar sama sekali, jadikan primary otomatis
    const imageCount = await this.prisma.productImage.count({
      where: { productId },
    });
    const shouldBePrimary = isPrimary || imageCount === 0;

    const image = await this.prisma.productImage.create({
      data: {
        productId,
        url: imageUrl,
        isPrimary: shouldBePrimary,
      },
    });

    this.logger.log(
      `Image uploaded for product: ${productId}`,
      'ProductsService',
    );
    return image;
  }

  // ─── Delete Image ─────────────────────────────────────────────
  async deleteImage(productId: number, imageId: number) {
    this.logger.log(
      `Deleting image ${imageId} from product ${productId}`,
      'ProductsService',
    );

    const image = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });

    if (!image) throw new NotFoundException('Image not found');

    this.imageService.deleteImage(image.url);

    await this.prisma.productImage.delete({ where: { id: imageId } });

    // Kalau gambar yang dihapus adalah primary, set gambar lain jadi primary
    if (image.isPrimary) {
      const nextImage = await this.prisma.productImage.findFirst({
        where: { productId },
      });
      if (nextImage) {
        await this.prisma.productImage.update({
          where: { id: nextImage.id },
          data: { isPrimary: true },
        });
      }
    }

    return { message: 'Image deleted successfully' };
  }
}
