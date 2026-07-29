#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  migratePostgresSchema,
  readMigrationConfiguration,
} from "./migrate.mjs";

const configuration = readMigrationConfiguration({
  DATABASE_ADMIN_URL: "postgresql://admin@example.test/marketing_os",
  DATABASE_APP_ROLE: "marketing_os_app",
  DATABASE_ADMIN_SSL: "require",
});
assert.equal(
  configuration.databaseAdminUrl,
  "postgresql://admin@example.test/marketing_os",
);
assert.equal(configuration.databaseSsl, true);
assert.equal(configuration.databaseAppRole, "marketing_os_app");
assert.throws(
  () => readMigrationConfiguration({}),
  /DATABASE_ADMIN_URL is required/,
);

const calls = [];
let released = false;
let ended = false;
const result = await migratePostgresSchema({
  ...configuration,
  schema: "BEGIN; SELECT 1; COMMIT;",
  createPool(options) {
    assert.equal(options.max, 1);
    assert.deepEqual(options.ssl, { rejectUnauthorized: true });
    return {
      async connect() {
        return {
          async query(sql) {
            calls.push(sql);
            if (sql.includes("to_regclass")) {
              return {
                rows: [{
                  tenants: "marketing_os_tenants",
                  audit: "marketing_os_audit",
                }],
              };
            }
            if (sql.includes("FROM pg_roles")) {
              return {
                rows: [{ rolsuper: false, rolbypassrls: false }],
              };
            }
            return { rows: [] };
          },
          release() {
            released = true;
          },
        };
      },
      async end() {
        ended = true;
      },
    };
  },
});
assert.equal(result.status, "applied");
assert.equal(result.application_role, "marketing_os_app");
assert.equal(calls[0], "BEGIN; SELECT 1; COMMIT;");
assert.ok(
  calls.some((sql) => sql.includes("GRANT USAGE ON SCHEMA public")),
);
assert.equal(released, true);
assert.equal(ended, true);

let rollbackSeen = false;
await assert.rejects(
  () =>
    migratePostgresSchema({
      databaseAdminUrl: configuration.databaseAdminUrl,
      databaseAppRole: configuration.databaseAppRole,
      schema: "INVALID",
      createPool() {
        return {
          async connect() {
            return {
              async query(sql) {
                if (sql === "ROLLBACK") {
                  rollbackSeen = true;
                  return { rows: [] };
                }
                throw new Error("migration failed");
              },
              release() {},
            };
          },
          async end() {},
        };
      },
    }),
  /migration failed/,
);
assert.equal(rollbackSeen, true);

console.log("Marketing OS PostgreSQL migration test OK.");
