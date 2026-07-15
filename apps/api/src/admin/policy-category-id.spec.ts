import { coerceOptionalPolicyCategoryId } from './policy-category-id';

describe('coerceOptionalPolicyCategoryId', () => {
  it('preserves the custom-writing sentinel for mode inference', () => {
    expect(coerceOptionalPolicyCategoryId(' custom ')).toBe('custom');
  });

  it('preserves ObjectIds and explicit clears', () => {
    expect(coerceOptionalPolicyCategoryId('68345f00aa11bb22cc33dd99')).toBe(
      '68345f00aa11bb22cc33dd99',
    );
    expect(coerceOptionalPolicyCategoryId('  ')).toBe('');
  });

  it('drops omitted sentinels and clears other malformed identifiers', () => {
    expect(coerceOptionalPolicyCategoryId(undefined)).toBeUndefined();
    expect(coerceOptionalPolicyCategoryId('undefined')).toBeUndefined();
    expect(coerceOptionalPolicyCategoryId('not-a-category')).toBe('');
  });
});
