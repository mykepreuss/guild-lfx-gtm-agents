import assert from "node:assert/strict";
import fs from "node:fs";

const main = fs.readFileSync(new URL("./main.tf", import.meta.url), "utf8");
const variables = fs.readFileSync(
  new URL("./variables.tf", import.meta.url),
  "utf8",
);
const outputs = fs.readFileSync(
  new URL("./outputs.tf", import.meta.url),
  "utf8",
);
const runbook = fs.readFileSync(
  new URL("./README.md", import.meta.url),
  "utf8",
);

for (const requiredControl of [
  'database_version    = "POSTGRES_16"',
  'availability_type = "REGIONAL"',
  "point_in_time_recovery_enabled = true",
  "private_network",
  'ipv4_enabled                                  = false',
  "encryption_key_name",
  'role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"',
  'name = "DATABASE_URL"',
  'name = "DATABASE_ADMIN_URL"',
  'name  = "GUILD_DELEGATED_ISSUER"',
  'name  = "GUILD_DELEGATED_AUDIENCE"',
  'name  = "GUILD_DELEGATED_JWKS_URL"',
  'member   = "allUsers"',
]) {
  assert.match(
    main,
    new RegExp(escapeRegExp(requiredControl)),
    `GCP deployment is missing required control: ${requiredControl}`,
  );
}

assert.match(
  variables,
  /@sha256:\[0-9a-f\]\{64\}\$/,
  "Container images must be pinned to an immutable digest.",
);
assert.match(
  variables,
  /variable "guild_delegated_issuer"[\s\S]*variable "guild_delegated_audience"[\s\S]*variable "guild_delegated_jwks_url"/,
  "All delegated Guild identity values must be explicit inputs.",
);
assert.match(
  main,
  /resource "google_service_account" "runtime"/,
  "Runtime service account is required.",
);
assert.match(
  main,
  /resource "google_service_account" "migration"/,
  "Migration service account is required.",
);
assert.doesNotMatch(
  outputs,
  /password|secret_data/,
  "Terraform outputs must not expose database passwords or secret payloads.",
);
assert.match(
  runbook,
  /Do not apply this module with placeholder identity values\./,
  "The deployment runbook must retain the delegated-identity release boundary.",
);
assert.match(
  runbook,
  /Generated database\s+passwords are sensitive and are present in Terraform state/,
  "The deployment runbook must disclose sensitive Terraform-state handling.",
);

console.log("GCP deployment contract tests passed.");

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
