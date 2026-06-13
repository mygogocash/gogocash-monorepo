import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { faqItemsForLocale, faqLocaleFromLandingPath } from "./locale-faq";
import { FAQ_ITEMS } from "./faq-data";
import { LOCALE_HOME_IDS } from "./locale-home-registry";

describe("locale-faq", () => {
  it("maps landing paths to FAQ locales", () => {
    assert.equal(faqLocaleFromLandingPath("/"), "en");
    assert.equal(faqLocaleFromLandingPath("/en"), "en");
    assert.equal(faqLocaleFromLandingPath("/en/foo"), "en");
    assert.equal(faqLocaleFromLandingPath("/id"), "en");
    assert.equal(faqLocaleFromLandingPath("/th"), "th");
    assert.equal(faqLocaleFromLandingPath("/th/x"), "th");
    assert.equal(faqLocaleFromLandingPath("/tw"), "tw");
    assert.equal(faqLocaleFromLandingPath("/ja"), "ja");
    assert.equal(faqLocaleFromLandingPath("/cn"), "cn");
    assert.equal(faqLocaleFromLandingPath("/cn/x"), "cn");
  });

  it("faqItemsForLocale(en) matches English FAQ list", () => {
    assert.deepEqual(faqItemsForLocale("en"), FAQ_ITEMS);
  });

  it("returns non-empty FAQ for each locale", () => {
    for (const id of ["en", "th", "tw", "ja", "cn"] as const) {
      assert.ok(faqItemsForLocale(id).length > 0, id);
    }
  });

  it("every LocaleHomePage locale has FAQ copy", () => {
    for (const id of LOCALE_HOME_IDS) {
      assert.ok(faqItemsForLocale(id).length > 0, id);
    }
  });
});
