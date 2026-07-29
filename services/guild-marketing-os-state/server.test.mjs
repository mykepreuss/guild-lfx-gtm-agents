#!/usr/bin/env node

import assert from "node:assert/strict";
import { once } from "node:events";
import fs from "node:fs";
import { createNodeServer, readConfiguration } from "./server.mjs";

const configuration = readConfiguration({
  PORT: "8080",
  DATABASE_URL: "postgresql://state@example.test/state",
  DATABASE_POOL_SIZE: "7",
  DATABASE_SSL: "require",
  KMS_KEY_NAME:
    "projects/test/locations/global/keyRings/r/cryptoKeys/k",
  GUILD_DELEGATED_ISSUER: "https://guild.example.test",
  GUILD_DELEGATED_AUDIENCE: "guild-marketing-os-state",
  GUILD_DELEGATED_JWKS_URL: "https://guild.example.test/.well-known/jwks.json",
});
assert.equal(configuration.port, 8080);
assert.equal(configuration.databasePoolSize, 7);
assert.equal(configuration.databaseSsl, true);
assert.equal(configuration.rateLimitMaxRequests, 120);
assert.equal(configuration.rateLimitWindowSeconds, 60);
assert.throws(() => readConfiguration({ PORT: "8080" }), /DATABASE_URL/);

const dockerfile = fs.readFileSync(new URL("./Dockerfile", import.meta.url), "utf8");
for (const required of [
  "FROM node:24-bookworm-slim",
  "npm ci --omit=dev",
  "postgres/migrate.mjs",
  "USER node",
  'CMD ["node", "server.mjs"]',
]) {
  assert.ok(dockerfile.includes(required), `Dockerfile is missing ${required}`);
}

const server = createNodeServer(async (request) => {
  return new Response(
    JSON.stringify({
      method: request.method,
      path: new URL(request.url).pathname,
      body: request.method === "POST" ? await request.json() : null,
    }),
    {
      status: 202,
      headers: { "content-type": "application/json" },
    },
  );
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
try {
  const address = server.address();
  const response = await fetch(
    `http://127.0.0.1:${address.port}/v1/example`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ safe: true }),
    },
  );
  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), {
    method: "POST",
    path: "/v1/example",
    body: { safe: true },
  });
} finally {
  await new Promise((resolve) => server.close(resolve));
}

console.log("Marketing OS Cloud Run server test OK.");
