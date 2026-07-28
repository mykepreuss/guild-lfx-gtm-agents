#!/usr/bin/env node

import http from "node:http";
import { Readable } from "node:stream";
import { pathToFileURL } from "node:url";
import { GoogleKmsEnvelopeEncryption } from "./envelope-encryption.mjs";
import { createMarketingOsStateHandler } from "./http-service.mjs";
import { createGuildJwksIdentityVerifier } from "./identity.mjs";
import { PostgresMarketingOsStateAdapter } from "./postgres-adapter.mjs";

export function createNodeServer(handler) {
  return http.createServer(async (incoming, outgoing) => {
    try {
      const request = new Request(
        `http://state.internal${incoming.url ?? "/"}`,
        {
          method: incoming.method,
          headers: incoming.headers,
          body:
            incoming.method === "GET" || incoming.method === "HEAD"
              ? undefined
              : Readable.toWeb(incoming),
          duplex:
            incoming.method === "GET" || incoming.method === "HEAD"
              ? undefined
              : "half",
        },
      );
      const response = await handler(request);
      outgoing.statusCode = response.status;
      for (const [name, value] of response.headers) {
        outgoing.setHeader(name, value);
      }
      outgoing.end(Buffer.from(await response.arrayBuffer()));
    } catch {
      outgoing.statusCode = 500;
      outgoing.setHeader("content-type", "application/json; charset=utf-8");
      outgoing.setHeader("cache-control", "no-store");
      outgoing.end(
        JSON.stringify({
          error: {
            code: "internal_error",
            message: "The state service could not complete the request.",
          },
        }),
      );
    }
  });
}

export function startStateService(environment = process.env) {
  const configuration = readConfiguration(environment);
  const adapter = new PostgresMarketingOsStateAdapter({
    connectionString: configuration.databaseUrl,
    encryption: new GoogleKmsEnvelopeEncryption({
      keyName: configuration.kmsKeyName,
    }),
    poolOptions: {
      max: configuration.databasePoolSize,
      ssl: configuration.databaseSsl
        ? { rejectUnauthorized: true }
        : undefined,
    },
  });
  const verifyIdentity = createGuildJwksIdentityVerifier({
    issuer: configuration.guildIssuer,
    audience: configuration.guildAudience,
    jwksUrl: configuration.guildJwksUrl,
  });
  const handler = createMarketingOsStateHandler({
    adapter,
    verifyIdentity,
    checkReady: async () => {
      if (!(await adapter.healthCheck())) throw new Error("not ready");
    },
    rateLimit: {
      maxRequests: configuration.rateLimitMaxRequests,
      windowSeconds: configuration.rateLimitWindowSeconds,
    },
  });
  const server = createNodeServer(handler);
  server.listen(configuration.port, "0.0.0.0", () => {
    console.log(
      JSON.stringify({
        event: "state_service.started",
        port: configuration.port,
        context_publication: "blocked_pending_delegated_publisher",
      }),
    );
  });
  return { server, adapter, configuration };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const running = startStateService();
  let closing = false;
  for (const signal of ["SIGTERM", "SIGINT"]) {
    process.once(signal, () => {
      if (closing) return;
      closing = true;
      const force = setTimeout(() => process.exit(1), 10_000);
      force.unref();
      running.server.close(async () => {
        try {
          await running.adapter.close();
          process.exit(0);
        } catch {
          process.exit(1);
        }
      });
    });
  }
}

export function readConfiguration(environment) {
  return {
    port: positiveInteger(environment.PORT ?? "8080", "PORT"),
    databaseUrl: requiredEnvironment(environment, "DATABASE_URL"),
    databasePoolSize: positiveInteger(
      environment.DATABASE_POOL_SIZE ?? "10",
      "DATABASE_POOL_SIZE",
    ),
    databaseSsl: environment.DATABASE_SSL === "require",
    rateLimitMaxRequests: positiveInteger(
      environment.RATE_LIMIT_MAX_REQUESTS ?? "120",
      "RATE_LIMIT_MAX_REQUESTS",
    ),
    rateLimitWindowSeconds: positiveInteger(
      environment.RATE_LIMIT_WINDOW_SECONDS ?? "60",
      "RATE_LIMIT_WINDOW_SECONDS",
    ),
    kmsKeyName: requiredEnvironment(environment, "KMS_KEY_NAME"),
    guildIssuer: requiredEnvironment(
      environment,
      "GUILD_DELEGATED_ISSUER",
    ),
    guildAudience: requiredEnvironment(
      environment,
      "GUILD_DELEGATED_AUDIENCE",
    ),
    guildJwksUrl: requiredEnvironment(
      environment,
      "GUILD_DELEGATED_JWKS_URL",
    ),
  };
}

function requiredEnvironment(environment, name) {
  const value = environment[name];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${name} is required.`);
  }
  return value.trim();
}

function positiveInteger(value, name) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > 65_535) {
    throw new Error(`${name} must be a positive integer no greater than 65535.`);
  }
  return number;
}
