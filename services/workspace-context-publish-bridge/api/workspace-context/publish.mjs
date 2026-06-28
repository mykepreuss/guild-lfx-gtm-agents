import {
  BridgeError,
  isBridgeRequestAuthorized,
  publishWorkspaceContext,
} from "../../bridge.mjs";

export default async function handler(request, response) {
  try {
    if (request.method !== "POST") {
      response.setHeader("allow", "POST");
      return sendJson(response, 405, { error: "method_not_allowed", message: "POST is required." });
    }
    if (!isBridgeRequestAuthorized(request.headers, process.env.BRIDGE_API_TOKEN)) {
      return sendJson(response, 401, { error: "unauthorized", message: "Bridge API token is required." });
    }

    const result = await publishWorkspaceContext(parseRequestBody(request.body), {
      guildApiBaseUrl: process.env.GUILD_API_BASE_URL,
      guildApiToken: process.env.GUILD_API_TOKEN,
      allowedWorkspaceIds: process.env.GUILD_ALLOWED_WORKSPACE_IDS,
      allowedWorkspaceFullNames: process.env.GUILD_ALLOWED_WORKSPACE_FULL_NAMES,
    });
    return sendJson(response, 200, result);
  } catch (error) {
    const status = error instanceof BridgeError ? error.status : 500;
    const code = error instanceof BridgeError ? error.code : "internal_error";
    return sendJson(response, status, { error: code, message: error instanceof Error ? error.message : String(error) });
  }
}

function sendJson(response, status, body) {
  response.status(status).json(body);
}

function parseRequestBody(body) {
  if (typeof body !== "string") return body ?? {};
  if (!body.trim()) return {};
  try {
    return JSON.parse(body);
  } catch {
    throw new BridgeError(400, "invalid_json", "Request body must be valid JSON.");
  }
}
