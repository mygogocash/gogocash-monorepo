import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  customerIoFormsConfig,
  involveAsiaConfig,
  isMarketingAnalyticsEnabled,
  marketingSiteOrigin,
  marketingSiteUrl,
  publicFirebaseConfig,
  publicFirebaseMeasurementId,
  publicLineTagId,
  newsletterSignupConfig,
  publicPostHogHost,
  shouldLoadPostHog,
  strapiBaseUrl,
} from "./app-config";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("app-config", () => {
  it("prefers NEXT_PUBLIC_SITE_URL over VERCEL_URL", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com";
    process.env.VERCEL_URL = "preview.vercel.app";

    assert.equal(marketingSiteUrl(), "https://example.com/");
    assert.equal(marketingSiteOrigin(), "https://example.com");
  });

  it("falls back to VERCEL_URL when the public site url is missing", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.VERCEL_URL = "landing-preview.vercel.app";

    assert.equal(marketingSiteUrl(), "https://landing-preview.vercel.app/");
  });

  it("uses production as the default analytics mode", () => {
    delete process.env.NEXT_PUBLIC_ANALYTICS_ENABLED;
    process.env = { ...process.env, NODE_ENV: "production" };
    assert.equal(isMarketingAnalyticsEnabled(), true);

    process.env = { ...process.env, NODE_ENV: "development" };
    assert.equal(isMarketingAnalyticsEnabled(), false);
  });

  it("honors analytics overrides", () => {
    process.env.NEXT_PUBLIC_ANALYTICS_ENABLED = "true";
    process.env = { ...process.env, NODE_ENV: "development" };
    assert.equal(isMarketingAnalyticsEnabled(), true);

    process.env.NEXT_PUBLIC_ANALYTICS_ENABLED = "false";
    process.env = { ...process.env, NODE_ENV: "production" };
    assert.equal(isMarketingAnalyticsEnabled(), false);
  });

  it("exposes LINE Tag id by default and allows disabling with empty env", () => {
    delete process.env.NEXT_PUBLIC_LINE_TAG_ID;
    assert.match(publicLineTagId() ?? "", /^[0-9a-f-]{36}$/i);

    process.env.NEXT_PUBLIC_LINE_TAG_ID = "";
    assert.equal(publicLineTagId(), null);
    delete process.env.NEXT_PUBLIC_LINE_TAG_ID;
  });

  it("returns the default public firebase config with overrides applied", () => {
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "custom-project";
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID = "G-CUSTOM";

    const config = publicFirebaseConfig();
    assert.ok(config);
    assert.equal(config?.projectId, "custom-project");
    assert.equal(publicFirebaseMeasurementId(), "G-CUSTOM");
  });

  it("normalizes strapi base url and involve asia pagination bounds", () => {
    process.env.STRAPI_URL = "https://cms.example.com/";
    process.env.INVOLVE_ASIA_MAX_OFFER_PAGES = "100";

    assert.equal(strapiBaseUrl(), "https://cms.example.com");
    assert.equal(involveAsiaConfig().maxOfferPages, 50);

    process.env.INVOLVE_ASIA_MAX_OFFER_PAGES = "0";
    assert.equal(involveAsiaConfig().maxOfferPages, 5);
  });

  it("loads PostHog only when a key is set, honoring overrides", () => {
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    assert.equal(shouldLoadPostHog(), false);

    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test";
    process.env.NEXT_PUBLIC_POSTHOG_ENABLED = "true";
    process.env = { ...process.env, NODE_ENV: "development" };
    assert.equal(shouldLoadPostHog(), true);

    process.env.NEXT_PUBLIC_POSTHOG_ENABLED = "false";
    assert.equal(shouldLoadPostHog(), false);

    delete process.env.NEXT_PUBLIC_POSTHOG_ENABLED;
    process.env = { ...process.env, NODE_ENV: "production" };
    assert.equal(shouldLoadPostHog(), true);

    process.env = { ...process.env, NODE_ENV: "development" };
    assert.equal(shouldLoadPostHog(), false);
  });

  it("defaults the PostHog host to US and allows override", () => {
    delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
    assert.equal(publicPostHogHost(), "https://us.i.posthog.com");

    process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://eu.i.posthog.com";
    assert.equal(publicPostHogHost(), "https://eu.i.posthog.com");
  });

  it("loads Customer.io connected forms by default", () => {
    delete process.env.NEXT_PUBLIC_CUSTOMERIO_FORMS_SITE_ID;
    delete process.env.NEXT_PUBLIC_CUSTOMERIO_FORMS_BASE_URL;

    assert.deepEqual(customerIoFormsConfig(), {
      siteId: "527b19a2b583c66362d2",
      baseUrl: "https://customerioforms.com",
      scriptUrl: "https://customerioforms.com/assets/forms.js",
    });
  });

  it("defaults newsletter signup to Customer.io connected forms", () => {
    delete process.env.NEXT_PUBLIC_NEWSLETTER_FORM_ACTION;
    delete process.env.NEXT_PUBLIC_CUSTOMERIO_FORMS_SITE_ID;

    assert.deepEqual(newsletterSignupConfig(), {
      actionUrl: null,
      emailField: "email",
      consentField: "pdpa_consent",
      sourceField: "source",
      sourceValue: "footer",
      customerIoFormsEnabled: true,
    });
  });

  it("normalizes newsletter provider action and field names", () => {
    process.env.NEXT_PUBLIC_NEWSLETTER_FORM_ACTION =
      " https://email.example.com/forms/signup ";
    process.env.NEXT_PUBLIC_NEWSLETTER_EMAIL_FIELD = "EMAIL";
    process.env.NEXT_PUBLIC_NEWSLETTER_CONSENT_FIELD = "consent[gdpr]";
    process.env.NEXT_PUBLIC_NEWSLETTER_SOURCE_FIELD = "meta-source";
    process.env.NEXT_PUBLIC_NEWSLETTER_SOURCE_VALUE = "footer-newsletter";

    assert.deepEqual(newsletterSignupConfig(), {
      actionUrl: "https://email.example.com/forms/signup",
      emailField: "EMAIL",
      consentField: "consent[gdpr]",
      sourceField: "meta-source",
      sourceValue: "footer-newsletter",
      customerIoFormsEnabled: true,
    });
  });

  it("rejects invalid newsletter provider config", () => {
    process.env.NEXT_PUBLIC_NEWSLETTER_FORM_ACTION = "not a url";
    process.env.NEXT_PUBLIC_NEWSLETTER_EMAIL_FIELD = "bad field";
    process.env.NEXT_PUBLIC_NEWSLETTER_CONSENT_FIELD = "";
    process.env.NEXT_PUBLIC_NEWSLETTER_SOURCE_FIELD = "source<script>";

    assert.deepEqual(newsletterSignupConfig(), {
      actionUrl: null,
      emailField: "email",
      consentField: "pdpa_consent",
      sourceField: "source",
      sourceValue: "footer",
      customerIoFormsEnabled: true,
    });
  });

  it("can disable Customer.io connected forms with an empty site id", () => {
    process.env.NEXT_PUBLIC_CUSTOMERIO_FORMS_SITE_ID = "";

    assert.deepEqual(customerIoFormsConfig(), {
      siteId: null,
      baseUrl: "https://customerioforms.com",
      scriptUrl: "https://customerioforms.com/assets/forms.js",
    });
    assert.equal(newsletterSignupConfig().customerIoFormsEnabled, false);
  });
});
