#!/usr/bin/env node
/**
 * Add staging hostnames to Firebase authorized domains and optional test phone numbers.
 * Requires: gcloud auth login + project gogocash-staging
 *
 * Usage: node scripts/firebase-staging-auth-setup.mjs
 */
import { execSync } from "node:child_process";

const PROJECT = "gogocash-staging";
const PROJECT_NUMBER = "729804769570";
const ADD_DOMAINS = [
  "app-staging.gogocash.co",
  "admin-staging.gogocash.co",
];
const ADD_TEST_PHONES = {
  "+66999999999": "654321",
};

function token() {
  return execSync("gcloud auth print-access-token", { encoding: "utf8" }).trim();
}

async function getConfig() {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT}/config`,
    {
      headers: {
        Authorization: `Bearer ${token()}`,
        "x-goog-user-project": PROJECT,
      },
    },
  );
  if (!res.ok) {
    throw new Error(`GET config failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function patchConfig(body, updateMask) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT}/config?updateMask=${updateMask}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token()}`,
        "Content-Type": "application/json",
        "x-goog-user-project": PROJECT,
      },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    throw new Error(`PATCH config failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

const config = await getConfig();
const domains = [...new Set([...(config.authorizedDomains ?? []), ...ADD_DOMAINS])];

const updated = await patchConfig(
  {
    authorizedDomains: domains,
  },
  "authorizedDomains",
);

console.log(`Patched Firebase project ${PROJECT} (${PROJECT_NUMBER})`);
console.log("authorizedDomains:", updated.authorizedDomains);
console.log(
  "existing testPhoneNumbers (unchanged):",
  config.signIn?.phoneNumber?.testPhoneNumbers ?? {},
);
