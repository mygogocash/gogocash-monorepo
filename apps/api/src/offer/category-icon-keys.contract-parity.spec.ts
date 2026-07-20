// Guards the deliberate duplication between the API's runtime CATEGORY_ICON_KEYS
// and the canonical @gogocash/contracts allow-list. The API SWC runtime cannot
// load the source-consumed contracts package, so the list lives twice — this
// spec turns silent drift into a red build.
import {
  CATEGORY_ICON_KEYS as contractKeys,
  CATEGORY_ICON_LABELS as contractLabels,
} from '../../../../packages/contracts/src/index';
import { CATEGORY_ICON_KEYS } from './schemas/category.schema';

describe('category-icon-keys contract parity', () => {
  it('matches the contracts allow-list order and membership', () => {
    expect([...CATEGORY_ICON_KEYS]).toEqual([...contractKeys]);
  });

  it('contracts labels cover every API key', () => {
    for (const key of CATEGORY_ICON_KEYS) {
      expect(contractLabels[key]).toEqual(expect.any(String));
    }
  });
});
