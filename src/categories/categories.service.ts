import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../logger/logger.service';
import { CreateCategoryDto } from './schemas/create-category.schema';
import { UpdateCategoryDto } from './schemas/update-category.schema';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  // ─── Helper: generate slug ────────────────────────────────────
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  // ─── Get All ─────────────────────────────────────────────────
  async findAll() {
    this.logger.log('Fetching all categories', 'CategoriesService');
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { products: true } }, // jumlah produk per kategori
      },
    });
  }

  // ─── Get One by Slug ─────────────────────────────────────────
  async findBySlug(slug: string) {
    this.logger.log(`Fetching category: ${slug}`, 'CategoriesService');

    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        _count: { select: { products: true } },
      },
    });

    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  // ─── Get One by ID ────────────────────────────────────────────
  async findById(id: number) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  // ─── Create ───────────────────────────────────────────────────
  async create(dto: CreateCategoryDto) {
    this.logger.log(`Creating category: ${dto.name}`, 'CategoriesService');

    const slug = this.generateSlug(dto.name);

    const existing = await this.prisma.category.findUnique({ where: { slug } });
    if (existing) {
      this.logger.warn(`Category already exists: ${slug}`, 'CategoriesService');
      throw new ConflictException('Category with this name already exists');
    }

    const category = await this.prisma.category.create({
      data: { name: dto.name, slug, description: dto.description },
    });

    this.logger.log(`Category created: ${category.id}`, 'CategoriesService');
    return category;
  }

  // ─── Update ───────────────────────────────────────────────────
  async update(id: number, dto: UpdateCategoryDto) {
    this.logger.log(`Updating category: ${id}`, 'CategoriesService');

    await this.findById(id);

    const data: any = { ...dto };

    if (dto.name) {
      const slug = this.generateSlug(dto.name);

      // Cek slug tidak bentrok dengan kategori lain
      const existing = await this.prisma.category.findFirst({
        where: { slug, NOT: { id } },
      });
      if (existing)
        throw new ConflictException('Category with this name already exists');

      data.slug = slug;
    }

    const updated = await this.prisma.category.update({
      where: { id },
      data,
    });

    this.logger.log(`Category updated: ${id}`, 'CategoriesService');
    return updated;
  }

  // ─── Delete ───────────────────────────────────────────────────
  async delete(id: number) {
    this.logger.log(`Deleting category: ${id}`, 'CategoriesService');

    const category = await this.findById(id);

    // Cek apakah ada produk yang pakai kategori ini
    const productCount = await this.prisma.product.count({
      where: { categoryId: id },
    });

    if (productCount > 0) {
      throw new ConflictException(
        `Cannot delete category. ${productCount} product(s) still using this category.`,
      );
    }

    await this.prisma.category.delete({ where: { id } });

    this.logger.log(`Category deleted: ${id}`, 'CategoriesService');
    return { message: 'Category deleted successfully' };
  }
}
