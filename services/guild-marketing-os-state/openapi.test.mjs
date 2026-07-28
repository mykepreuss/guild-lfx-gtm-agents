#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import { stateServiceRouteDefinitions } from "./http-service.mjs";

const specification = JSON.parse(
  fs.readFileSync(new URL("./openapi.json", import.meta.url), "utf8"),
);

assert.equal(specification.openapi, "3.0.3");
assert.deepEqual(specification.security, [
  { guildDelegatedIdentity: [] },
]);

const expectedOperations = new Set([
  "GET /healthz",
  "GET /readyz",
  ...stateServiceRouteDefinitions.map(
    (route) => `${route.method} ${route.path}`,
  ),
]);
const actualOperations = new Set();
const operationIds = new Set();
for (const [path, pathItem] of Object.entries(specification.paths)) {
  for (const method of ["get", "post", "put", "patch", "delete"]) {
    const operation = pathItem[method];
    if (!operation) continue;
    actualOperations.add(`${method.toUpperCase()} ${path}`);
    assert.equal(
      operationIds.has(operation.operationId),
      false,
      `Duplicate OpenAPI operationId: ${operation.operationId}`,
    );
    operationIds.add(operation.operationId);
    if (!["/healthz", "/readyz"].includes(path)) {
      assert.equal(
        operation.security,
        undefined,
        `${method.toUpperCase()} ${path} must inherit delegated JWT security.`,
      );
    }
  }
}
assert.deepEqual(actualOperations, expectedOperations);

const contextPublish =
  specification.paths["/v1/context/publish"].post;
assert.match(
  contextPublish.description,
  /separate marketing_os\.context\.publish delegated scope/,
);
const contextApproval =
  specification.components.schemas.PublishContextRequest.properties
    .approval_text.enum;
assert.deepEqual(contextApproval, [
  "publish approved context to workspace context",
]);
assert.deepEqual(
  specification.components.schemas.DeleteWorkspaceRequest.properties
    .confirmation_text.enum,
  ["delete marketing os workspace data"],
);
assert.deepEqual(
  specification.components.schemas.SafetyEnvelope.properties.action_mode
    .enum,
  ["draft_only"],
);
assert.deepEqual(
  specification.components.schemas.SafetyEnvelope.properties
    .external_mutation_requested.enum,
  [false],
);
assert.doesNotMatch(
  JSON.stringify(specification.components.schemas),
  /organization_id|workspace_id|maintainer_token|api_key/i,
  "Request schemas must not accept tenant identity or maintainer credentials.",
);

console.log("Marketing OS OpenAPI contract test OK.");
