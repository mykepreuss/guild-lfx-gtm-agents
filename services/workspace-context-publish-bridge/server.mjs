#!/usr/bin/env node
import http from "node:http";
import {
  BridgeError,
  isBridgeRequestAuthorized,
  publishWorkspaceContext,
} from "./bridge.mjs";

const port = Number.parseInt(process.env.PORT ?? "8787", 10);
const bridgeApiToken = process.env.BRIDGE_API_TOKEN;
const options = {
  guildApiBaseUrl: process.env.GUILD_API_BASE_URL,
  guildApiToken: process.env.GUILD_API_TOKEN,
  allowedWorkspaceIds: process.env.GUILD_ALLOWED_WORKSPACE_IDS,
  allowedWorkspaceFullNames: process.env.GUILD_ALLOWED_WORKSPACE_FULL_NAMES,
};

const server = http.createServer(async (request, response) => {
  try {
    if (request.method === "GET" && request.url === "/health") {
      return sendJson(response, 200, { status: "ok" });
    }
    if (request.method !== "POST" || request.url !== "/workspace-context/publish") {
      return sendJson(response, 404, { error: "not_found", message: "Route not found." });
    }
    if (!isBridgeRequestAuthorized(request.headers, bridgeApiToken)) {
      return sendJson(response, 401, { error: "unauthorized", message: "Bridge API token is required." });
    }

    const body = await readJsonBody(request);
    const result = await publishWorkspaceContext(body, options);
    return sendJson(response, 200, result);
  } catch (error) {
    const status = error instanceof BridgeError ? error.status : 500;
    const code = error instanceof BridgeError ? error.code : "internal_error";
    return sendJson(response, status, { error: code, message: error instanceof Error ? error.message : String(error) });
  }
});

server.listen(port, () => {
  process.stdout.write(`Workspace context publish bridge listening on :${port}\n`);
});

function sendJson(response, status, body) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new BridgeError(400, "invalid_json", "Request body must be valid JSON.");
  }
}
