import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LOCALE_HOME_COPY,
  LOCALE_HOME_IDS,
  localeHomeCopy,
} from "./locale-home-registry";
import { TH_HOME } from "./copy-th-home";

describe("locale-home-registry", () => {
  it("exposes every locale id in the copy map", () => {
    for (const id of LOCALE_HOME_IDS) {
      assert.ok(LOCALE_HOME_COPY[id]);
    }
    assert.equal(Object.keys(LOCALE_HOME_COPY).length, LOCALE_HOME_IDS.length);
  });

  it("localeHomeCopy returns the same objects as legacy module exports", () => {
    assert.equal(localeHomeCopy("th"), TH_HOME);
  });
});
