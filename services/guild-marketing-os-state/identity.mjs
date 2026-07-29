import { StateContractError, assertTenant, requiredString } from "./contracts.mjs";

export const STATE_SCOPE = "marketing_os:state";
export const CONTEXT_PUBLISH_SCOPE = "marketing_os:context_publish";

export function delegatedIdentity(
  claims,
  { requiredScopes = [STATE_SCOPE] } = {},
) {
  if (!claims || typeof claims !== "object") {
    throw new StateContractError(
      "invalid_delegated_identity",
      "Delegated Guild identity claims are required.",
      401,
    );
  }

  const tenant = assertTenant({
    organization_id: claims.organization_id,
    workspace_id: claims.workspace_id,
  });
  const scopes = normalizeScopes(claims.scope ?? claims.scopes);
  for (const requiredScope of requiredScopes) {
    if (!scopes.includes(requiredScope)) {
      throw new StateContractError(
        "insufficient_scope",
        `Delegated identity is missing required scope: ${requiredScope}.`,
        403,
      );
    }
  }

  return Object.freeze({
    tenant,
    actor: requiredString(claims.sub, "identity.sub"),
    session_id: requiredString(claims.session_id, "identity.session_id"),
    task_id: requiredString(claims.task_id, "identity.task_id"),
    issuer: requiredString(claims.iss, "identity.iss"),
    audience: normalizeAudience(claims.aud),
    scopes: Object.freeze(scopes),
    expires_at: requiredNumericDate(claims.exp, "identity.exp"),
  });
}

export function createGuildJwksIdentityVerifier({
  issuer,
  audience,
  jwksUrl,
  requiredScopes = [STATE_SCOPE],
  algorithms = ["RS256", "ES256"],
  clockTolerance = 5,
} = {}) {
  const expectedIssuer = requiredString(issuer, "issuer");
  const expectedAudience = requiredString(audience, "audience");
  const keyUrl = new URL(requiredString(jwksUrl, "jwksUrl"));
  let keySet;

  return async function verifyGuildIdentity(request) {
    const authorization = request.headers.get("authorization") ?? "";
    const match = authorization.match(/^Bearer\s+(\S+)$/i);
    if (!match) {
      throw new StateContractError(
        "delegated_authorization_required",
        "A delegated Guild bearer token is required.",
        401,
      );
    }

    const { createRemoteJWKSet, jwtVerify } = await import("jose");
    keySet ??= createRemoteJWKSet(keyUrl);
    let verified;
    try {
      verified = await jwtVerify(match[1], keySet, {
        issuer: expectedIssuer,
        audience: expectedAudience,
        algorithms,
        clockTolerance,
      });
    } catch {
      throw new StateContractError(
        "invalid_delegated_authorization",
        "The delegated Guild bearer token could not be verified.",
        401,
      );
    }

    return delegatedIdentity(verified.payload, { requiredScopes });
  };
}

export function requireIdentityScope(identity, scope) {
  if (!identity?.scopes?.includes(scope)) {
    throw new StateContractError(
      "insufficient_scope",
      `Delegated identity is missing required scope: ${scope}.`,
      403,
    );
  }
}

export function assertRequestTenantMatches(body, identity) {
  if (!body || typeof body !== "object") return;
  const claimedOrganization =
    body.organization_id ?? body.tenant?.organization_id;
  const claimedWorkspace = body.workspace_id ?? body.tenant?.workspace_id;
  if (
    (claimedOrganization !== undefined &&
      claimedOrganization !== identity.tenant.organization_id) ||
    (claimedWorkspace !== undefined &&
      claimedWorkspace !== identity.tenant.workspace_id)
  ) {
    throw new StateContractError(
      "tenant_binding_mismatch",
      "Request tenant fields do not match the verified delegated identity.",
      403,
    );
  }
}

function normalizeScopes(value) {
  const scopes =
    typeof value === "string"
      ? value.split(/\s+/)
      : Array.isArray(value)
        ? value
        : [];
  if (scopes.some((scope) => typeof scope !== "string")) {
    throw new StateContractError(
      "invalid_delegated_identity",
      "Delegated identity scopes are invalid.",
      401,
    );
  }
  return [...new Set(scopes.map((scope) => scope.trim()).filter(Boolean))];
}

function normalizeAudience(value) {
  if (typeof value === "string" && value.trim()) return Object.freeze([value]);
  if (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => typeof item === "string" && item.trim())
  ) {
    return Object.freeze([...value]);
  }
  throw new StateContractError(
    "invalid_delegated_identity",
    "Delegated identity audience is required.",
    401,
  );
}

function requiredNumericDate(value, field) {
  if (!Number.isInteger(value) || value < 1) {
    throw new StateContractError(
      "invalid_delegated_identity",
      `${field} is required.`,
      401,
    );
  }
  return value;
}
