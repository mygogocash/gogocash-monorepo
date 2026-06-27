import { escapeRegexLiteral } from './escape-regex';

describe('escapeRegexLiteral', () => {
  it('given regex metacharacters > then escapes them for literal MongoDB $regex', () => {
    expect(escapeRegexLiteral('a.*')).toBe('a\\.\\*');
    expect(escapeRegexLiteral('food+')).toBe('food\\+');
    expect(escapeRegexLiteral('save?')).toBe('save\\?');
  });

  it('given plain text > then returns unchanged text', () => {
    expect(escapeRegexLiteral('shopee')).toBe('shopee');
  });
});
