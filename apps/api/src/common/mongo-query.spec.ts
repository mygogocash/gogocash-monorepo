import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

import {
  escapeJsStringLiteral,
  mongoCaseInsensitiveRegex,
  normalizeSlugSegment,
  requireObjectId,
  requireOneOf,
} from './mongo-query';

describe('mongo-query helpers', () => {
  it('requireObjectId > given invalid id > then throws', () => {
    expect(() => requireObjectId('not-an-id')).toThrow(BadRequestException);
  });

  it('requireObjectId > given valid id > then returns ObjectId', () => {
    const id = new Types.ObjectId().toHexString();
    expect(requireObjectId(id).toHexString()).toBe(id);
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
});
