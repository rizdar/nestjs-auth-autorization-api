import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import {
  AddToCartSchema,
  type AddToCartDto,
} from './schemas/add-to-cart.schema';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { ZodValidationPipe } from 'nestjs-zod';
import {
  type UpdateCartItemDto,
  UpdateCartItemSchema,
} from './schemas/update-cart.schema';
import { Auth } from 'src/common/decorator/swagger.decorator';

@ApiTags('Cart')
@Controller('cart')
@UseGuards(JwtAuthGuard)
@Auth()
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user cart' })
  @ApiResponse({ status: 200, description: 'Cart retrieved successfully' })
  getCart(@CurrentUser() user: { sub: number }) {
    return this.cartService.getCart(user.sub);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiBody({
    schema: {
      example: { productId: 1, quantity: 2 },
    },
  })
  @ApiResponse({ status: 201, description: 'Item added to cart' })
  @ApiResponse({ status: 400, description: 'Insufficient stock' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  addToCart(
    @CurrentUser() user: { sub: number },
    @Body(new ZodValidationPipe(AddToCartSchema)) dto: AddToCartDto,
  ) {
    return this.cartService.addToCart(user.sub, dto);
  }

  @Patch('items/:itemId')
  @ApiOperation({ summary: 'Update cart item quantity' })
  @ApiParam({ name: 'itemId', example: 1 })
  @ApiBody({
    schema: {
      example: { quantity: 3 },
    },
  })
  @ApiResponse({ status: 200, description: 'Cart item updated' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  updateCartItem(
    @CurrentUser() user: { sub: number },
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body(new ZodValidationPipe(UpdateCartItemSchema)) dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateCartItem(user.sub, itemId, dto);
  }

  @Delete('items/:itemId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiParam({ name: 'itemId', example: 1 })
  @ApiResponse({ status: 200, description: 'Item removed from cart' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  removeCartItem(
    @CurrentUser() user: { sub: number },
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    return this.cartService.removeCartItem(user.sub, itemId);
  }

  @Delete('clear')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear all items from cart' })
  @ApiResponse({ status: 200, description: 'Cart cleared successfully' })
  clearCart(@CurrentUser() user: { sub: number }) {
    return this.cartService.clearCart(user.sub);
  }
}
