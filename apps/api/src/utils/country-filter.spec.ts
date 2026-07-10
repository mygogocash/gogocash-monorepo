import { countryFilterRegex } from './country';

// Field bug 2026-07-10: the customer app sends ISO-2 (`country=MY`) but
// Involve-synced offers store comma-separated full English names
// ("Australia, Malaysia, Singapore, Thailand, United States of America").
// The old substring regex made only TH/PH work — by accident ("THailand",
// "PHilippines") — and would false-match IN inside "INdonesia".
// countryFilterRegex returns a token-anchored, case-insensitive regex SOURCE
// (or null for blank input) matching the country as a whole list token.

function matches(country: string, countriesField: string): boolean {
  const source = countryFilterRegex(country);
  if (source === null) {
    throw new Error(`expected a regex for ${JSON.stringify(country)}`);
  }
  return new RegExp(source, 'i').test(countriesField);
}

describe('countryFilterRegex', () => {
  const INVOLVE_MY =
    'Australia, Malaysia, Singapore, Thailand, United States of America';

  it('given ISO-2 MY > then matches a full-name Involve countries list', () => {
    expect(matches('MY', INVOLVE_MY)).toBe(true);
  });

  it('given ISO-2 SG > then matches a single full-name entry', () => {
    expect(matches('SG', 'Singapore')).toBe(true);
  });

  it('given ISO-2 TH > then matches full names and ISO-2 token lists', () => {
    expect(matches('TH', 'Thailand')).toBe(true);
    expect(matches('TH', 'TH,VN')).toBe(true);
    expect(matches('th', 'Thailand')).toBe(true);
  });

  it('given ISO-2 of a non-listed country > then does not match', () => {
    expect(matches('JP', INVOLVE_MY)).toBe(false);
    expect(matches('VN', 'Thailand')).toBe(false);
  });

  it('given ISO-2 IN > then never substring-matches Indonesia', () => {
    expect(matches('IN', 'Indonesia')).toBe(false);
    expect(matches('IN', 'India, Nepal')).toBe(true);
  });

  it('given a full English name > then still matches (admin/legacy callers)', () => {
    expect(matches('Thailand', INVOLVE_MY)).toBe(true);
    expect(matches('Malaysia', 'Thailand')).toBe(false);
  });

  it('given multi-label countries > then all known spellings match', () => {
    expect(matches('US', 'United States of America')).toBe(true);
    expect(matches('US', 'United States')).toBe(true);
  });

  it('given regex metacharacters > then input is escaped literally', () => {
    expect(matches('Thailand?', 'Thailand?')).toBe(true);
    expect(matches('Thailand?', 'Thailand')).toBe(false);
  });

  it('given blank input > then returns null (no filter)', () => {
    expect(countryFilterRegex('')).toBeNull();
    expect(countryFilterRegex('   ')).toBeNull();
    expect(countryFilterRegex(null)).toBeNull();
    expect(countryFilterRegex(undefined)).toBeNull();
  });
});
