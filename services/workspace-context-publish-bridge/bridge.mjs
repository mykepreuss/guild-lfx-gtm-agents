const defaultGuildApiBaseUrl = "https://app.guild.ai/api";
const managedContextStart = "<!-- guild-marketing-os-context:start -->";
const managedContextEnd = "<!-- guild-marketing-os-context:end -->";
const approvalPhrase = "publish approved context to workspace context";

export class BridgeError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = "BridgeError";
    this.status = status;
    this.code = code;
  }
}

export function validatePublishRequest(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new BridgeError(400, "invalid_request", "Request body must be a JSON object.");
  }

  const requiredStrings = ["session_id", "managed_context", "summary", "start_marker", "end_marker", "company_name"];
  for (const field of requiredStrings) {
    if (typeof value[field] !== "string" || value[field].trim() === "") {
      throw new BridgeError(400, "invalid_request", `${field} is required.`);
    }
  }

  if (value.approval_phrase !== approvalPhrase) {
    throw new BridgeError(403, "approval_required", "Exact workspace context publish approval phrase is required.");
  }
  if (value.start_marker !== managedContextStart || value.end_marker !== managedContextEnd) {
    throw new BridgeError(400, "invalid_markers", "Managed context markers do not match the Guild Marketing OS marker contract.");
  }
  assertManagedBlockIsComplete(value.managed_context);

  return {
    session_id: value.session_id,
    managed_context: value.managed_context,
    summary: value.summary,
    start_marker: value.start_marker,
    end_marker: value.end_marker,
    company_name: value.company_name,
    approval_phrase: value.approval_phrase,
    approved_at: typeof value.approved_at === "string" ? value.approved_at : undefined,
  };
}

export function replaceManagedWorkspaceContextBlock(currentContext, managedBlock) {
  const existing = String(currentContext ?? "");
  const trimmedBlock = String(managedBlock ?? "").trim();
  assertManagedBlockIsComplete(trimmedBlock);

  const start = existing.indexOf(managedContextStart);
  const end = existing.indexOf(managedContextEnd);
  if ((start === -1) !== (end === -1)) {
    throw new BridgeError(409, "partial_managed_block", "Existing workspace context contains only one managed marker; refusing to publish over ambiguous manual context.");
  }

  if (start !== -1 && end !== -1) {
    if (end <= start) {
      throw new BridgeError(409, "invalid_managed_block_order", "Existing workspace context managed markers are out of order.");
    }
    return [
      existing.slice(0, start).trimEnd(),
      trimmedBlock,
      existing.slice(end + managedContextEnd.length).trimStart(),
    ].filter(Boolean).join("\n\n").trim() + "\n";
  }

  return [existing.trim(), trimmedBlock].filter(Boolean).join("\n\n").trim() + "\n";
}

export async function publishWorkspaceContext(requestBody, options = {}) {
  const request = validatePublishRequest(requestBody);
  const guildFetch = options.guildFetch ?? createGuildFetch({
    guildApiBaseUrl: options.guildApiBaseUrl,
    guildApiToken: options.guildApiToken,
  });

  const session = await guildFetch(`/sessions/${encodeURIComponent(request.session_id)}`);
  const workspace = session?.workspace;
  const workspaceId = workspace?.id;
  const workspaceFullName = workspace?.full_name;
  if (!workspaceId) {
    throw new BridgeError(404, "workspace_not_found", "Could not resolve a workspace for the supplied session.");
  }
  assertWorkspaceAllowed(workspaceId, workspaceFullName, options);

  const contexts = await guildFetch(`/workspaces/${encodeURIComponent(workspaceId)}/contexts?limit=20&offset=0`);
  const previousContext = findPublishedContext(contexts);
  const currentManualContext = previousContext?.manual_context ?? "";
  const updatedContext = replaceManagedWorkspaceContextBlock(currentManualContext, request.managed_context);

  const draft = await guildFetch(`/workspaces/${encodeURIComponent(workspaceId)}/contexts`, {
    method: "POST",
    body: {
      status: "DRAFT",
      context: updatedContext,
      summary: request.summary,
    },
  });
  const draftId = draft?.id;
  if (!draftId) {
    throw new BridgeError(502, "draft_not_created", "Guild did not return a draft context id.");
  }

  const published = await guildFetch(`/contexts/${encodeURIComponent(draftId)}`, {
    method: "PATCH",
    body: { status: "PUBLISHED" },
  });
  const publishedId = published?.id ?? draftId;

  return {
    status: "PUBLISHED",
    workspace_id: workspaceId,
    workspace_full_name: workspaceFullName,
    previous_context_id: previousContext?.id ?? null,
    draft_context_id: draftId,
    published_context_id: publishedId,
    summary: published?.summary ?? draft?.summary ?? request.summary,
    publish_path: "host_bridge",
    rollback_reference: previousContext?.id
      ? `Re-publish previous workspace context ${previousContext.id} to roll back.`
      : "No previous published workspace context was present before this publish.",
  };
}

export function createGuildFetch({ guildApiBaseUrl = defaultGuildApiBaseUrl, guildApiToken } = {}) {
  if (!guildApiToken) {
    throw new BridgeError(500, "missing_guild_api_token", "GUILD_API_TOKEN is required.");
  }
  const baseUrl = guildApiBaseUrl.replace(/\/+$/, "");

  return async function guildFetch(path, init = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      method: init.method ?? "GET",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${guildApiToken}`,
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    const text = await response.text();
    const data = text ? parseJson(text, `Guild API returned non-JSON for ${path}.`) : undefined;
    if (!response.ok) {
      const detail = data?.message ?? data?.detail ?? text ?? response.statusText;
      throw new BridgeError(response.status, "guild_api_error", `Guild API ${response.status} for ${path}: ${detail}`);
    }
    return data;
  };
}

export function isBridgeRequestAuthorized(headers, bridgeApiToken) {
  if (!bridgeApiToken) return true;
  const authorization = headers.authorization ?? headers.Authorization ?? "";
  const bearer = typeof authorization === "string" && authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice("bearer ".length)
    : undefined;
  const apiKey = headers["x-api-key"] ?? headers["X-API-Key"];
  return bearer === bridgeApiToken || apiKey === bridgeApiToken;
}

function assertManagedBlockIsComplete(value) {
  const start = value.indexOf(managedContextStart);
  const end = value.indexOf(managedContextEnd);
  if (start === -1 || end === -1 || end <= start) {
    throw new BridgeError(400, "invalid_managed_block", "Managed context must contain start and end markers in order.");
  }
}

function assertWorkspaceAllowed(workspaceId, workspaceFullName, options) {
  const allowedIds = csvSet(options.allowedWorkspaceIds);
  const allowedNames = csvSet(options.allowedWorkspaceFullNames);
  if (allowedIds.size && !allowedIds.has(workspaceId)) {
    throw new BridgeError(403, "workspace_not_allowed", "Resolved workspace id is not allowed for this bridge.");
  }
  if (allowedNames.size && (!workspaceFullName || !allowedNames.has(workspaceFullName))) {
    throw new BridgeError(403, "workspace_not_allowed", "Resolved workspace full name is not allowed for this bridge.");
  }
}

function csvSet(value) {
  return new Set(String(value ?? "").split(",").map((item) => item.trim()).filter(Boolean));
}

function findPublishedContext(contexts) {
  const items = Array.isArray(contexts?.items) ? contexts.items : Array.isArray(contexts) ? contexts : [];
  return items.find((item) => String(item?.status ?? "").toUpperCase() === "PUBLISHED") ?? null;
}

function parseJson(text, message) {
  try {
    return JSON.parse(text);
  } catch {
    throw new BridgeError(502, "invalid_json", message);
  }
}
