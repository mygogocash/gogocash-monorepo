import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

import {
  escapeJsStringLiteral,
  mongoCaseInsensitiveRegex,
  mongoEq,
  mongoFilter,
  mongoSetUpdate,
  mongoUpdate,
  normalizeSlugSegment,
  requireFiniteNumber,
  requireObjectId,
  requireObjectIdHex,
  requireOneOf,
  requireTrimmedString,
} from './mongo-query';

describe('mongo-query helpers', () => {
  it('requireObjectId > given invalid id > then throws', () => {
    expect(() => requireObjectId('not-an-id')).toThrow(BadRequestException);
  });

  it('requireObjectId > given valid id > then returns ObjectId', () => {
    const id = new Types.ObjectId().toHexString();
    expect(requireObjectId(id).toHexString()).toBe(id);
  });

  it('requireObjectIdHex > given valid id > then returns hex string', () => {
    const id = new Types.ObjectId().toHexString();
    expect(requireObjectIdHex(id)).toBe(id);
  });

  it('mongoCaseInsensitiveRegex > given metacharacters > then escapes input', () => {
    expect(mongoCaseInsensitiveRegex('a.*').$regex).toBe('a\\.\\*');
  });

  it('requireOneOf > given unknown value > then throws', () => {
    expect(() => requireOneOf('x', ['a', 'b'] as const, 'type')).toThrow(
      BadRequestException,
    );
  });

  it('normalizeSlugSegment > given long hyphen padding > then trims safely', () => {
    expect(normalizeSlugSegment('---hello---')).toBe('hello');
  });

  it('escapeJsStringLiteral > given quotes and backslashes > then escapes', () => {
    expect(escapeJsStringLiteral(`a\\'b`)).toBe(`a\\\\\\'b`);
  });

  it('mongoEq > given validated scalar > then wraps with $eq', () => {
    expect(mongoEq('pending')).toEqual({ $eq: 'pending' });
  });

  it('mongoFilter > given validated filter > then returns same object', () => {
    const filter = { status: mongoEq('active') };
    expect(mongoFilter(filter)).toBe(filter);
  });

  it('mongoUpdate > given validated update > then returns same object', () => {
    const update = { status: 'approved' };
    expect(mongoUpdate(update)).toBe(update);
  });

  it('mongoSetUpdate > given validated fields > then wraps with $set', () => {
    expect(mongoSetUpdate({ status: 'approved' })).toEqual({
      $set: { status: 'approved' },
    });
  });

  it('requireTrimmedString > given blank input > then throws', () => {
    expect(() => requireTrimmedString('   ', 10, 'name')).toThrow(
      BadRequestException,
    );
  });

  it('requireFiniteNumber > given NaN > then throws', () => {
    expect(() => requireFiniteNumber('abc', 'score')).toThrow(
      BadRequestException,
    );
  });
});
