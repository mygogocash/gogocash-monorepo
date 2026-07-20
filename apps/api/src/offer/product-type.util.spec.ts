import { BadRequestException } from '@nestjs/common';
import {
  parseProductTypeRowsField,
  requireProductTypeRowsField,
  resolveProductTypeUpdate,
} from './product-type.util';

describe('product-type.util', () => {
  it('parseProductTypeRowsField > given undefined > then returns undefined (partial update)', () => {
    expect(parseProductTypeRowsField(undefined)).toBeUndefined();
    expect(parseProductTypeRowsField(null)).toBeUndefined();
  });

  it('parseProductTypeRowsField > given a JSON array string > then returns the rows', () => {
    expect(
      parseProductTypeRowsField(
        JSON.stringify([{ name: 'Fashion', commission_info: '5.6' }]),
      ),
    ).toEqual([{ name: 'Fashion', commission_info: '5.6' }]);
  });

  it('parseProductTypeRowsField > given an empty JSON array > then returns []', () => {
    expect(parseProductTypeRowsField('[]')).toEqual([]);
  });

  it('parseProductTypeRowsField > given invalid JSON > then returns undefined (soft)', () => {
    expect(parseProductTypeRowsField('{not-json')).toBeUndefined();
    expect(parseProductTypeRowsField('{"name":"x"}')).toBeUndefined();
  });

  it('requireProductTypeRowsField > given invalid JSON > then throws 400', () => {
    expect(() =>
      requireProductTypeRowsField('{not-json', 'product_types'),
    ).toThrow(BadRequestException);
    expect(() =>
      requireProductTypeRowsField('{"name":"x"}', 'product_types'),
    ).toThrow(BadRequestException);
  });

  it('requireProductTypeRowsField > given [] > then returns empty array', () => {
    expect(requireProductTypeRowsField('[]', 'product_types')).toEqual([]);
  });

  it('resolveProductTypeUpdate > prefers product_types over product_type', () => {
    expect(
      resolveProductTypeUpdate({
        product_types: JSON.stringify([{ name: 'A' }]),
        product_type: [{ name: 'B' }],
      }),
    ).toEqual([{ name: 'A' }]);
  });

  it('resolveProductTypeUpdate > given neither field > then returns undefined', () => {
    expect(resolveProductTypeUpdate({})).toBeUndefined();
  });

  it('resolveProductTypeUpdate > given invalid product_types > then throws 400', () => {
    expect(() =>
      resolveProductTypeUpdate({ product_types: 'not-an-array' }),
    ).toThrow(BadRequestException);
  });
});
