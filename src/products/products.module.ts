import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ImageService } from 'src/common/services/image.service';

@Module({
  imports: [PrismaModule],
  providers: [ProductsService, ImageService],
  controllers: [ProductsController],
})
export class ProductsModule {}
