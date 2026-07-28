import { StateContractError } from "./contracts.mjs";
import {
  CONTEXT_PUBLISH_SCOPE,
  assertRequestTenantMatches,
  requireIdentityScope,
} from "./identity.mjs";

const jsonHeaders = Object.freeze({
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
});

export const stateServiceRouteDefinitions = Object.freeze([
  {
    method: "GET",
    path: "/v1/context",
    name: "context_read",
    hasBody: false,
  },
  {
    method: "POST",
    path: "/v1/context/publish",
    name: "context_publish",
    hasBody: true,
  },
  {
    method: "POST",
    path: "/v1/sources",
    name: "source_store",
    hasBody: true,
  },
  {
    method: "GET",
    path: "/v1/sources/{sourceId}",
    pattern: /^\/v1\/sources\/([^/]+)$/,
    parameter: "sourceId",
    name: "source_get",
    hasBody: false,
  },
  {
    method: "POST",
    path: "/v1/sources/{sourceId}/revisions",
    pattern: /^\/v1\/sources\/([^/]+)\/revisions$/,
    parameter: "sourceId",
    name: "source_revise",
    hasBody: true,
  },
  {
    method: "DELETE",
    path: "/v1/sources/{sourceId}",
    pattern: /^\/v1\/sources\/([^/]+)$/,
    parameter: "sourceId",
    name: "source_delete",
    hasBody: true,
  },
  {
    method: "POST",
    path: "/v1/artifacts",
    name: "artifact_store",
    hasBody: true,
  },
  {
    method: "GET",
    path: "/v1/artifacts/{artifactId}",
    pattern: /^\/v1\/artifacts\/([^/]+)$/,
    parameter: "artifactId",
    name: "artifact_get",
    hasBody: false,
  },
  {
    method: "POST",
    path: "/v1/artifacts/{artifactId}/revisions",
    pattern: /^\/v1\/artifacts\/([^/]+)\/revisions$/,
    parameter: "artifactId",
    name: "artifact_revise",
    hasBody: true,
  },
  {
    method: "POST",
    path: "/v1/artifacts/{artifactId}/status",
    pattern: /^\/v1\/artifacts\/([^/]+)\/status$/,
    parameter: "artifactId",
    name: "artifact_status",
    hasBody: true,
  },
  {
    method: "POST",
    path: "/v1/artifacts/{artifactId}/approve",
    pattern: /^\/v1\/artifacts\/([^/]+)\/approve$/,
    parameter: "artifactId",
    name: "artifact_approve",
    hasBody: true,
  },
  {
    method: "GET",
    path: "/v1/workstreams/{specialist}",
    pattern: /^\/v1\/workstreams\/([^/]+)$/,
    parameter: "specialist",
    name: "workstream_read",
    hasBody: false,
  },
  {
    method: "PUT",
    path: "/v1/workstreams/{specialist}",
    pattern: /^\/v1\/workstreams\/([^/]+)$/,
    parameter: "specialist",
    name: "workstream_update",
    hasBody: true,
  },
  {
    method: "POST",
    path: "/v1/handoffs",
    name: "handoff_create",
    hasBody: true,
  },
  {
    method: "PUT",
    path: "/v1/handoffs/{handoffId}",
    pattern: /^\/v1\/handoffs\/([^/]+)$/,
    parameter: "handoffId",
    name: "handoff_update",
    hasBody: true,
  },
  {
    method: "GET",
    path: "/v1/audit",
    name: "audit_read",
    hasBody: false,
  },
  {
    method: "GET",
    path: "/v1/export",
    name: "workspace_export",
    hasBody: false,
  },
  {
    method: "DELETE",
    path: "/v1/workspace",
    name: "workspace_delete",
    hasBody: true,
  },
]);

export function createMarketingOsStateHandler({
  adapter,
  verifyIdentity,
  contextPublisher,
  checkReady,
  rateLimit = { maxRequests: 120, windowSeconds: 60 },
  maxBodyBytes = 2 * 1024 * 1024,
} = {}) {
  if (!adapter || typeof adapter !== "object") {
    throw new TypeError("A MarketingOsStateAdapter is required.");
  }
  if (typeof verifyIdentity !== "function") {
    throw new TypeError("A delegated identity verifier is required.");
  }
  const normalizedRateLimit = normalizeRateLimit(rateLimit);

  return async function handleMarketingOsStateRequest(request) {
    try {
      const url = new URL(request.url);
      if (request.method === "GET" && url.pathname === "/healthz") {
        return jsonResponse(200, {
          status: "ok",
          context_publication: contextPublisher ? "configured" : "blocked",
        });
      }
      if (request.method === "GET" && url.pathname === "/readyz") {
        if (typeof checkReady === "function") {
          try {
            await checkReady();
          } catch {
            throw new StateContractError(
              "service_unavailable",
              "The state service is not ready.",
              503,
            );
          }
        }
        return jsonResponse(200, { status: "ready" });
      }

      const identity = await verifyIdentity(request);
      const route = matchRoute(request.method, url.pathname);
      if (!route) {
        throw new StateContractError(
          "route_not_found",
          "State service route was not found.",
          404,
        );
      }
      if (normalizedRateLimit) {
        await adapter.consumeRateLimit(identity.tenant, {
          subject: identity.actor,
          max_requests: normalizedRateLimit.maxRequests,
          window_seconds: normalizedRateLimit.windowSeconds,
          permit_deleted_tenant: route.name === "workspace_delete",
        });
      }

      const body =
        route.hasBody === false
          ? undefined
          : await readJsonBody(request, maxBodyBytes);
      assertRequestTenantMatches(body, identity);
      const requestValue = attachTrustedActor(body, identity);
      const tenant = identity.tenant;

      switch (route.name) {
        case "context_read":
          return jsonResponse(200, {
            data: (await adapter.readContextSnapshot(tenant)) ?? null,
          });
        case "context_publish": {
          requireIdentityScope(identity, CONTEXT_PUBLISH_SCOPE);
          if (typeof contextPublisher !== "function") {
            throw new StateContractError(
              "delegated_context_publication_unavailable",
              "Workspace-scoped delegated context publication is not configured.",
              503,
            );
          }
          const snapshot = await adapter.publishContextSnapshot(
            tenant,
            requestValue,
            {
              publisher: async () =>
                contextPublisher({
                  identity,
                  request: requestValue,
                }),
            },
          );
          return jsonResponse(201, { data: snapshot });
        }
        case "source_store":
          return jsonResponse(201, {
            data: await adapter.storeSource(tenant, {
              ...requestValue,
              uploader: identity.actor,
            }),
          });
        case "source_get":
          return jsonResponse(200, {
            data: await adapter.getSource(
              tenant,
              route.params.sourceId,
              optionalRevision(url.searchParams.get("revision")),
            ),
          });
        case "source_revise":
          return jsonResponse(201, {
            data: await adapter.reviseSource(tenant, {
              ...requestValue,
              source_id: route.params.sourceId,
              uploader: identity.actor,
            }),
          });
        case "source_delete":
          return jsonResponse(200, {
            data: await adapter.deleteSource(tenant, {
              ...requestValue,
              source_id: route.params.sourceId,
            }),
          });
        case "artifact_store":
          return jsonResponse(201, {
            data: await adapter.storeArtifact(tenant, requestValue),
          });
        case "artifact_get": {
          const revision = optionalRevision(url.searchParams.get("revision"));
          return jsonResponse(200, {
            data: await adapter.getArtifact(
              tenant,
              route.params.artifactId,
              revision,
            ),
          });
        }
        case "artifact_revise":
          return jsonResponse(201, {
            data: await adapter.reviseArtifact(tenant, {
              ...requestValue,
              artifact_id: route.params.artifactId,
            }),
          });
        case "artifact_status":
          return jsonResponse(200, {
            data: await adapter.setArtifactStatus(tenant, {
              ...requestValue,
              artifact_id: route.params.artifactId,
            }),
          });
        case "artifact_approve":
          return jsonResponse(200, {
            data: await adapter.approveArtifact(tenant, {
              ...requestValue,
              artifact_id: route.params.artifactId,
              actor: identity.actor,
            }),
          });
        case "workstream_read":
          return jsonResponse(200, {
            data:
              (await adapter.readWorkstream(
                tenant,
                route.params.specialist,
              )) ?? null,
          });
        case "workstream_update":
          return jsonResponse(200, {
            data: await adapter.updateWorkstream(tenant, {
              ...requestValue,
              specialist: route.params.specialist,
            }),
          });
        case "handoff_create":
          return jsonResponse(201, {
            data: await adapter.createHandoff(tenant, requestValue),
          });
        case "handoff_update":
          return jsonResponse(200, {
            data: await adapter.updateHandoff(tenant, {
              ...requestValue,
              handoff_id: route.params.handoffId,
            }),
          });
        case "audit_read":
          return jsonResponse(200, {
            data: await adapter.getAuditTrail(tenant),
          });
        case "workspace_export":
          return jsonResponse(200, {
            data: await adapter.exportWorkspace(tenant),
          });
        case "workspace_delete":
          return jsonResponse(200, {
            data: await adapter.deleteWorkspace(tenant, requestValue),
          });
      }
    } catch (error) {
      return errorResponse(error);
    }
  };
}

function normalizeRateLimit(value) {
  if (value === false) return undefined;
  if (!value || typeof value !== "object") {
    throw new TypeError("rateLimit must be false or an object.");
  }
  const maxRequests = Number(value.maxRequests);
  const windowSeconds = Number(value.windowSeconds);
  if (
    !Number.isInteger(maxRequests) ||
    maxRequests < 1 ||
    maxRequests > 100_000 ||
    !Number.isInteger(windowSeconds) ||
    windowSeconds < 1 ||
    windowSeconds > 86_400
  ) {
    throw new TypeError("rateLimit values are invalid.");
  }
  return Object.freeze({ maxRequests, windowSeconds });
}

function matchRoute(method, pathname) {
  for (const route of stateServiceRouteDefinitions) {
    if (method !== route.method) continue;
    if (!route.pattern && pathname === route.path) {
      return {
        name: route.name,
        hasBody: route.hasBody,
        params: {},
      };
    }
    const match = route.pattern ? pathname.match(route.pattern) : undefined;
    if (!match || !route.parameter) continue;
    return {
      name: route.name,
      hasBody: route.hasBody,
      params: { [route.parameter]: decodeURIComponent(match[1]) },
    };
  }
  return undefined;
}

async function readJsonBody(request, maxBodyBytes) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!/^application\/json(?:;|$)/i.test(contentType)) {
    throw new StateContractError(
      "json_content_type_required",
      "Content-Type must be application/json.",
      415,
    );
  }
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBodyBytes) {
    throw new StateContractError(
      "request_too_large",
      "Request body is too large.",
      413,
    );
  }
  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > maxBodyBytes) {
    throw new StateContractError(
      "request_too_large",
      "Request body is too large.",
      413,
    );
  }
  try {
    const body = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new Error("body must be an object");
    }
    return body;
  } catch {
    throw new StateContractError(
      "invalid_json",
      "Request body must be a JSON object.",
      400,
    );
  }
}

function attachTrustedActor(body, identity) {
  if (!body) return body;
  const safe = structuredClone(body);
  delete safe.organization_id;
  delete safe.workspace_id;
  delete safe.tenant;
  return {
    ...safe,
    actor: identity.actor,
    session_id: identity.session_id,
    task_id: identity.task_id,
  };
}

function optionalRevision(value) {
  if (value === null) return undefined;
  const revision = Number(value);
  if (!Number.isInteger(revision) || revision < 1) {
    throw new StateContractError(
      "invalid_revision",
      "revision must be a positive integer.",
      400,
    );
  }
  return revision;
}

function jsonResponse(status, value) {
  return new Response(JSON.stringify(value), {
    status,
    headers: jsonHeaders,
  });
}

function errorResponse(error) {
  if (error instanceof StateContractError) {
    return jsonResponse(error.status, {
      error: {
        code: error.code,
        message: error.message,
      },
    });
  }
  return jsonResponse(500, {
    error: {
      code: "internal_error",
      message: "The state service could not complete the request.",
    },
  });
}
