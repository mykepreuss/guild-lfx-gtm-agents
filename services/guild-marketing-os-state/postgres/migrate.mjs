#!/usr/bin/env node

import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { Pool } from "pg";

const schemaUrl = new URL("./schema.sql", import.meta.url);
const applicationTables = [
  "marketing_os_tenants",
  "marketing_os_sources",
  "marketing_os_artifacts",
  "marketing_os_approvals",
  "marketing_os_context_snapshots",
  "marketing_os_workstreams",
  "marketing_os_handoffs",
  "marketing_os_workflow_runs",
  "marketing_os_workflow_attempts",
  "marketing_os_idempotency",
  "marketing_os_rate_limits",
  "marketing_os_audit",
  "marketing_os_deletion_receipts",
];

export function readMigrationConfiguration(environment = process.env) {
  return {
    databaseAdminUrl: requiredEnvironment(environment, "DATABASE_ADMIN_URL"),
    databaseAppRole: requiredEnvironment(environment, "DATABASE_APP_ROLE"),
    databaseSsl: environment.DATABASE_ADMIN_SSL === "require",
  };
}

export async function migratePostgresSchema({
  databaseAdminUrl,
  databaseAppRole,
  databaseSsl = false,
  schema = fs.readFileSync(schemaUrl, "utf8"),
  createPool = (options) => new Pool(options),
} = {}) {
  if (typeof databaseAdminUrl !== "string" || !databaseAdminUrl.trim()) {
    throw new Error("databaseAdminUrl is required.");
  }
  if (typeof schema !== "string" || !schema.trim()) {
    throw new Error("PostgreSQL schema is required.");
  }
  const appRole = postgresIdentifier(databaseAppRole, "databaseAppRole");

  const pool = createPool({
    connectionString: databaseAdminUrl.trim(),
    max: 1,
    ssl: databaseSsl ? { rejectUnauthorized: true } : undefined,
  });
  let client;
  try {
    client = await pool.connect();
    await client.query(schema);
    const result = await client.query(
      `SELECT to_regclass('public.marketing_os_tenants') AS tenants,
              to_regclass('public.marketing_os_audit') AS audit`,
    );
    if (!result.rows[0]?.tenants || !result.rows[0]?.audit) {
      throw new Error("Marketing OS schema verification failed.");
    }
    const role = await client.query(
      `SELECT rolsuper, rolbypassrls
         FROM pg_roles
        WHERE rolname = $1`,
      [appRole],
    );
    if (!role.rows[0]) {
      throw new Error(`PostgreSQL application role ${appRole} was not found.`);
    }
    if (role.rows[0].rolsuper || role.rows[0].rolbypassrls) {
      throw new Error(
        `PostgreSQL application role ${appRole} must not be superuser or BYPASSRLS.`,
      );
    }
    const quotedRole = quoteIdentifier(appRole);
    const quotedTables = applicationTables
      .map(quoteIdentifier)
      .join(", ");
    await client.query(
      `GRANT USAGE ON SCHEMA public TO ${quotedRole};
       GRANT SELECT, INSERT, UPDATE, DELETE
         ON TABLE ${quotedTables}
         TO ${quotedRole};
       REVOKE TRUNCATE, REFERENCES, TRIGGER
         ON TABLE ${quotedTables}
         FROM ${quotedRole};
       GRANT EXECUTE ON FUNCTION
         marketing_os_current_organization(),
         marketing_os_current_workspace()
         TO ${quotedRole};`,
    );
    return {
      status: "applied",
      tables: ["marketing_os_tenants", "marketing_os_audit"],
      application_role: appRole,
    };
  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Preserve the original migration failure.
      }
    }
    throw error;
  } finally {
    client?.release();
    await pool.end();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const configuration = readMigrationConfiguration();
  const result = await migratePostgresSchema(configuration);
  console.log(JSON.stringify(result));
}

function requiredEnvironment(environment, name) {
  const value = environment[name];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${name} is required.`);
  }
  return value.trim();
}

function postgresIdentifier(value, field) {
  if (
    typeof value !== "string" ||
    !/^[A-Za-z_][A-Za-z0-9_]{0,62}$/.test(value)
  ) {
    throw new Error(`${field} must be a valid PostgreSQL identifier.`);
  }
  return value;
}

function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`;
}
