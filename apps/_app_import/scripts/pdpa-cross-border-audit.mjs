#!/usr/bin/env node
/**
 * Cross-border transfer audit — lists expected providers (template).
 * Extend: read Datadog / infra inventory and diff vs DataTransferAgreement in DB.
 */
const PROVIDERS = [
  { provider: "AWS", country: "US/SG" },
  { provider: "MongoDB Atlas", country: "Various" },
  { provider: "Google Cloud / Firebase", country: "US/EU" },
  { provider: "Datadog", country: "US" },
  { provider: "Mixpanel", country: "US" },
  { provider: "PostHog", country: "EU/US" },
  { provider: "Intercom", country: "US" },
];

console.log("Cross-border vendor checklist (review SCC / DPA status in Privacy Center API):");
for (const p of PROVIDERS) {
  console.log(`- ${p.provider} (${p.country})`);
}
