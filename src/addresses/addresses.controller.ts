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
import { AddressesService } from './addresses.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import {
  CreateAddressSchema,
  type CreateAddressDto,
} from './schemas/create-address.schema';
import {
  UpdateAddressSchema,
  type UpdateAddressDto,
} from './schemas/update-address.schema';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { Auth } from 'src/common/decorator/swagger.decorator';
import { ZodValidationPipe } from 'nestjs-zod';

@ApiTags('Addresses')
@Controller('addresses')
@UseGuards(JwtAuthGuard)
@Auth()
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all my addresses' })
  @ApiResponse({ status: 200, description: 'List of addresses' })
  findAll(@CurrentUser() user: { sub: number }) {
    return this.addressesService.findAll(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get address detail' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, description: 'Address detail' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  findOne(
    @CurrentUser() user: { sub: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.addressesService.findOne(user.sub, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new address' })
  @ApiBody({
    schema: {
      example: {
        label: 'Rumah',
        recipientName: 'John Doe',
        phone: '08123456789',
        address: 'Jl. Contoh No. 1',
        city: 'Jakarta Selatan',
        province: 'DKI Jakarta',
        postalCode: '12345',
        isDefault: true,
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Address created' })
  create(
    @CurrentUser() user: { sub: number },
    @Body(new ZodValidationPipe(CreateAddressSchema)) dto: CreateAddressDto,
  ) {
    return this.addressesService.create(user.sub, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update address' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiBody({
    schema: {
      example: {
        label: 'Kantor',
        city: 'Bandung',
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Address updated' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  update(
    @CurrentUser() user: { sub: number },
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(UpdateAddressSchema)) dto: UpdateAddressDto,
  ) {
    return this.addressesService.update(user.sub, id, dto);
  }

  @Patch(':id/set-default')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set address as default' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, description: 'Default address updated' })
  setDefault(
    @CurrentUser() user: { sub: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.addressesService.setDefault(user.sub, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete address' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, description: 'Address deleted' })
  @ApiResponse({ status: 400, description: 'Address used in orders' })
  delete(
    @CurrentUser() user: { sub: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.addressesService.delete(user.sub, id);
  }
}
