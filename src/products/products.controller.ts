import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { Role } from '../../generated/prisma/client';

import {
  CreateProductSchema,
  type CreateProductDto,
} from './schemas/create-product.schema';
import {
  UpdateProductSchema,
  type UpdateProductDto,
} from './schemas/update-product.schema';
import {
  ProductQuerySchema,
  type ProductQueryDto,
} from './schemas/product-query.schema';

import { Roles } from 'src/common/decorator/roles-decorator';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Auth } from 'src/common/decorator/swagger.decorator';
import { ZodValidationPipe } from 'nestjs-zod';
import { multerConfig } from 'src/config/multer.config';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ─── Public ───────────────────────────────────────────────────
  @Get()
  @ApiOperation({ summary: 'Get all products with pagination & filter' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'search', required: false, example: 'laptop' })
  @ApiQuery({ name: 'categoryId', required: false, example: 1 })
  @ApiQuery({ name: 'minPrice', required: false, example: 100000 })
  @ApiQuery({ name: 'maxPrice', required: false, example: 5000000 })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['name', 'price', 'createdAt', 'stock'],
  })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({ status: 200, description: 'Paginated list of products' })
  findAll(@Query() query: ProductQueryDto) {
    const parsed = ProductQuerySchema.parse(query);
    return this.productsService.findAll(parsed);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get product by slug' })
  @ApiParam({ name: 'slug', example: 'laptop-asus-rog' })
  @ApiResponse({ status: 200, description: 'Product detail' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  findOne(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }

  // ─── Admin Only ───────────────────────────────────────────────
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Auth()
  @ApiOperation({ summary: 'Create product - Admin only' })
  @ApiBody({
    schema: {
      example: {
        categoryId: 1,
        name: 'Laptop Asus ROG',
        description: 'Gaming laptop with RTX 4060',
        price: 15000000,
        stock: 10,
        isActive: true,
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Product created' })
  create(
    @Body(new ZodValidationPipe(CreateProductSchema)) dto: CreateProductDto,
  ) {
    return this.productsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Auth()
  @ApiOperation({ summary: 'Update product - Admin only' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, description: 'Product updated' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(UpdateProductSchema)) dto: UpdateProductDto,
  ) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Auth()
  @ApiOperation({ summary: 'Delete product - Admin only' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, description: 'Product deleted' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.delete(id);
  }

  // ─── Upload Image ─────────────────────────────────────────────
  @Post(':id/images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Auth()
  @UseInterceptors(FileInterceptor('image', multerConfig))
  @ApiOperation({ summary: 'Upload product image - Admin only' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', example: 1 })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: { type: 'string', format: 'binary' },
        isPrimary: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Image uploaded' })
  uploadImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Body('isPrimary') isPrimary: string,
  ) {
    return this.productsService.uploadImage(id, file, isPrimary === 'true');
  }

  @Delete(':id/images/:imageId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Auth()
  @ApiOperation({ summary: 'Delete product image - Admin only' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiParam({ name: 'imageId', example: 1 })
  @ApiResponse({ status: 200, description: 'Image deleted' })
  @ApiResponse({ status: 404, description: 'Image not found' })
  deleteImage(
    @Param('id', ParseIntPipe) id: number,
    @Param('imageId', ParseIntPipe) imageId: number,
  ) {
    return this.productsService.deleteImage(id, imageId);
  }
}
