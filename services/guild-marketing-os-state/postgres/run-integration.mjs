#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import pg from "pg";

const { Client } = pg;
const docker = spawnSync("docker", ["info"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});
let database;

try {
  console.log(
    docker.status === 0
      ? "Starting disposable PostgreSQL container..."
      : "Starting disposable local PostgreSQL server...",
  );
  database =
    docker.status === 0
      ? await startDockerPostgres()
      : await startLocalPostgres();
  console.log("Waiting for disposable PostgreSQL...");
  await waitForPostgres(database.connectionString);
  console.log("Running PostgreSQL state integration suite...");

  const test = spawn(
    process.execPath,
    ["postgres/integration.test.mjs"],
    {
      cwd: new URL("..", import.meta.url),
      env: {
        ...process.env,
        POSTGRES_TEST_URL: database.connectionString,
      },
      stdio: "inherit",
    },
  );
  const status = await new Promise((resolve, reject) => {
    test.once("error", reject);
    test.once("exit", (code) => resolve(code ?? 1));
  });
  if (status !== 0) process.exitCode = status;
} finally {
  if (database) await database.cleanup();
}

async function waitForPostgres(connectionString) {
  const deadline = Date.now() + 30_000;
  let lastError;
  while (Date.now() < deadline) {
    const client = new Client({
      connectionString,
      connectionTimeoutMillis: 1_000,
      query_timeout: 2_000,
    });
    try {
      await client.connect();
      await client.query("SELECT 1");
      await client.end();
      return;
    } catch (error) {
      lastError = error;
      try {
        await client.end();
      } catch {
        // Retry until the bounded deadline.
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw lastError ?? new Error("PostgreSQL did not become ready.");
}

async function startDockerPostgres() {
  const suffix = crypto.randomBytes(5).toString("hex");
  const containerName = `guild-marketing-os-postgres-${suffix}`;
  const password = `postgres_${suffix}`;
  const run = spawnSync(
    "docker",
    [
      "run",
      "--rm",
      "--detach",
      "--name",
      containerName,
      "--env",
      `POSTGRES_PASSWORD=${password}`,
      "--env",
      "POSTGRES_DB=marketing_os_test",
      "--publish",
      "127.0.0.1::5432",
      "postgres:16-alpine",
    ],
    { encoding: "utf8" },
  );
  if (run.status !== 0) {
    throw new Error(run.stderr || "Could not start disposable PostgreSQL.");
  }
  const portResult = spawnSync(
    "docker",
    ["port", containerName, "5432/tcp"],
    { encoding: "utf8" },
  );
  const portMatch = portResult.stdout.match(/:(\d+)\s*$/);
  if (!portMatch) throw new Error("Could not resolve the PostgreSQL test port.");
  return {
    connectionString:
      `postgresql://postgres:${password}@127.0.0.1:${portMatch[1]}` +
      "/marketing_os_test",
    cleanup: async () => {
      spawnSync("docker", ["stop", "--time", "2", containerName], {
        encoding: "utf8",
        stdio: "ignore",
      });
    },
  };
}

async function startLocalPostgres() {
  const initdb = commandPath("initdb");
  const pgCtl = commandPath("pg_ctl");
  if (!initdb || !pgCtl) {
    throw new Error(
      "The Docker daemon is unavailable and local PostgreSQL binaries were not found.",
    );
  }
  const dataDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "guild-marketing-os-postgres-"),
  );
  const port = await availablePort();
  const initialize = spawnSync(
    initdb,
    [
      "--pgdata",
      dataDirectory,
      "--username",
      "postgres",
      "--auth",
      "trust",
      "--no-locale",
      "--encoding",
      "UTF8",
    ],
    { encoding: "utf8" },
  );
  if (initialize.status !== 0) {
    fs.rmSync(dataDirectory, { recursive: true, force: true });
    throw new Error(
      initialize.stderr || "Could not initialize disposable PostgreSQL.",
    );
  }
  const start = spawnSync(
    pgCtl,
    [
      "--pgdata",
      dataDirectory,
      "--log",
      path.join(dataDirectory, "postgres.log"),
      "--options",
      `-h 127.0.0.1 -p ${port}`,
      "--wait",
      "start",
    ],
    { encoding: "utf8" },
  );
  if (start.status !== 0) {
    fs.rmSync(dataDirectory, { recursive: true, force: true });
    throw new Error(start.stderr || "Could not start disposable PostgreSQL.");
  }
  const adminConnection = `postgresql://postgres@127.0.0.1:${port}/postgres`;
  await waitForPostgres(adminConnection);
  const client = new Client({
    connectionString: adminConnection,
    connectionTimeoutMillis: 1_000,
    query_timeout: 2_000,
  });
  await client.connect();
  try {
    await client.query("CREATE DATABASE marketing_os_test");
  } finally {
    await client.end();
  }
  return {
    connectionString:
      `postgresql://postgres@127.0.0.1:${port}/marketing_os_test`,
    cleanup: async () => {
      spawnSync(
        pgCtl,
        [
          "--pgdata",
          dataDirectory,
          "--mode",
          "fast",
          "--wait",
          "stop",
        ],
        { encoding: "utf8", stdio: "ignore" },
      );
      fs.rmSync(dataDirectory, { recursive: true, force: true });
    },
  };
}

function commandPath(command) {
  const result = spawnSync("sh", ["-c", `command -v ${command}`], {
    encoding: "utf8",
  });
  return result.status === 0 ? result.stdout.trim() : "";
}

async function availablePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  await new Promise((resolve) => server.close(resolve));
  if (!port) throw new Error("Could not reserve a PostgreSQL test port.");
  return port;
}
