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

export function createMarketingOsStateHandler({
  adapter,
  verifyIdentity,
  contextPublisher,
  maxBodyBytes = 2 * 1024 * 1024,
} = {}) {
  if (!adapter || typeof adapter !== "object") {
    throw new TypeError("A MarketingOsStateAdapter is required.");
  }
  if (typeof verifyIdentity !== "function") {
    throw new TypeError("A delegated identity verifier is required.");
  }

  return async function handleMarketingOsStateRequest(request) {
    try {
      const url = new URL(request.url);
      if (request.method === "GET" && url.pathname === "/healthz") {
        return jsonResponse(200, {
          status: "ok",
          context_publication: contextPublisher ? "configured" : "blocked",
        });
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
          const publication = await contextPublisher({
            identity,
            request: requestValue,
          });
          const snapshot = await adapter.publishContextSnapshot(tenant, {
            ...requestValue,
            guild_context_id: publication?.guild_context_id,
            rollback_context_id: publication?.rollback_context_id,
          });
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
            data: await adapter.getSource(tenant, route.params.sourceId),
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

function matchRoute(method, pathname) {
  const exact = {
    "GET /v1/context": ["context_read", false],
    "POST /v1/context/publish": ["context_publish", true],
    "POST /v1/sources": ["source_store", true],
    "POST /v1/artifacts": ["artifact_store", true],
    "POST /v1/handoffs": ["handoff_create", true],
    "GET /v1/audit": ["audit_read", false],
    "GET /v1/export": ["workspace_export", false],
    "DELETE /v1/workspace": ["workspace_delete", true],
  }[`${method} ${pathname}`];
  if (exact) return { name: exact[0], hasBody: exact[1], params: {} };

  const patterns = [
    ["GET", /^\/v1\/sources\/([^/]+)$/, "source_get", false, "sourceId"],
    ["DELETE", /^\/v1\/sources\/([^/]+)$/, "source_delete", true, "sourceId"],
    ["GET", /^\/v1\/artifacts\/([^/]+)$/, "artifact_get", false, "artifactId"],
    ["POST", /^\/v1\/artifacts\/([^/]+)\/revisions$/, "artifact_revise", true, "artifactId"],
    ["POST", /^\/v1\/artifacts\/([^/]+)\/status$/, "artifact_status", true, "artifactId"],
    ["POST", /^\/v1\/artifacts\/([^/]+)\/approve$/, "artifact_approve", true, "artifactId"],
    ["GET", /^\/v1\/workstreams\/([^/]+)$/, "workstream_read", false, "specialist"],
    ["PUT", /^\/v1\/workstreams\/([^/]+)$/, "workstream_update", true, "specialist"],
    ["PUT", /^\/v1\/handoffs\/([^/]+)$/, "handoff_update", true, "handoffId"],
  ];
  for (const [routeMethod, pattern, name, hasBody, parameter] of patterns) {
    if (method !== routeMethod) continue;
    const match = pathname.match(pattern);
    if (!match) continue;
    return {
      name,
      hasBody,
      params: { [parameter]: decodeURIComponent(match[1]) },
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
