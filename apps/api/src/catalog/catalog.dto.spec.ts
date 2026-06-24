import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import {
  CreateCatalogProductDto,
  CreateMediaUploadDto,
  UpdateOrderStatusDto,
} from './dto/catalog.dto';

describe('catalog DTO validation', () => {
  it('rejects product payloads with invalid inventory and currency', async () => {
    const dto = plainToInstance(CreateCatalogProductDto, {
      title: 'Starter product',
      slug: 'starter-product',
      brand_id: '64b7f5f6f1f1f1f1f1f1f1f1',
      default_sku: 'starter',
      price_amount: 100,
      currency: 'thb',
      inventory_quantity: -1,
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(expect.arrayContaining(['currency', 'inventory_quantity']));
  });

  it('accepts a publishable product payload with scheduled dates', async () => {
    const dto = plainToInstance(CreateCatalogProductDto, {
      title: 'Starter product',
      slug: 'starter-product',
      brand_id: '64b7f5f6f1f1f1f1f1f1f1f1',
      default_sku: 'starter',
      price_amount: 100,
      currency: 'THB',
      inventory_quantity: 10,
      status: 'published',
      scheduled_start_at: '2026-06-24T00:00:00.000Z',
      images: ['https://cdn.gogocash.co/catalog/product/starter.webp'],
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('limits catalog media uploads to supported image content types and size', async () => {
    const dto = plainToInstance(CreateMediaUploadDto, {
      filename: 'bad.gif',
      content_type: 'image/gif',
      size_bytes: 9_000_000,
      folder: 'product',
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(expect.arrayContaining(['content_type', 'size_bytes']));
  });

  it('keeps admin order transitions in the fulfillment/refund set', async () => {
    const dto = plainToInstance(UpdateOrderStatusDto, { status: 'paid' });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('status');
  });
});
