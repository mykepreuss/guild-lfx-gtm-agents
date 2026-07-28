#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));
const sql = fs.readFileSync(path.join(directory, "schema.sql"), "utf8");

const tenantTables = [
  "marketing_os_tenants",
  "marketing_os_sources",
  "marketing_os_artifacts",
  "marketing_os_approvals",
  "marketing_os_context_snapshots",
  "marketing_os_workstreams",
  "marketing_os_handoffs",
  "marketing_os_idempotency",
  "marketing_os_rate_limits",
  "marketing_os_audit",
  "marketing_os_deletion_receipts",
];

for (const table of tenantTables) {
  assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\b`));
}

for (const required of [
  "ENABLE ROW LEVEL SECURITY",
  "FORCE ROW LEVEL SECURITY",
  "marketing_os_current_organization()",
  "marketing_os_current_workspace()",
  "marketing_os_audit is append-only",
  "approved artifact requires an approval record",
  "publish approved context to workspace context",
  "completion_state IN ('pending', 'completed', 'blocked', 'failed')",
  "external_mutation_requested",
  "draft_only",
  "idempotency_key",
  "marketing_os_rate_limits_expiry",
  "revision",
]) {
  assert.ok(sql.includes(required), `schema is missing ${required}`);
}

assert.equal(
  /CREATE TABLE IF NOT EXISTS marketing_os_[^(]+\([^)]*organization_id text NOT NULL,[^)]*workspace_id text NOT NULL/s.test(
    sql,
  ),
  true,
);

console.log("Marketing OS PostgreSQL schema contract test OK.");
