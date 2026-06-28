# Workspace Context Publish Bridge

Host-controlled bridge for the Company Context Builder workspace-context publish flow.

This is maintainer infrastructure. External Guild users do not deploy or call this service directly; they use the Company Context Builder in Guild and approve the publish flow there.

The deployed agent must not call raw internal Guild service endpoints. Instead, after the user has approved the company context and sent the exact confirmation phrase, the agent calls this bridge through the `michaelpreuss~guild-marketing-os-workspace-context@1.0.1` service contract.

## Operation

`POST /workspace-context/publish`

The bridge:

1. Validates the exact approval phrase and managed marker contract.
2. Resolves the session workspace through the Guild API.
3. Verifies optional workspace allow-lists.
4. Reads current workspace context versions.
5. Replaces only the managed block between:
   - `<!-- guild-marketing-os-context:start -->`
   - `<!-- guild-marketing-os-context:end -->`
6. Preserves unmanaged manual workspace context before and after that block.
7. Creates a new draft context with `{ status: "DRAFT", context, summary }`.
8. Publishes the draft with `{ status: "PUBLISHED" }`.
9. Returns draft, published, previous context ids, summary, publish path, and rollback metadata.

The bridge uses the same supported API lifecycle as the Guild CLI workspace-context commands. It keeps Guild API credentials host-side; the agent sends only the managed compact context brief block and publish metadata. The raw approved source corpus stays in Company Context Builder session state for audit, not in the published workspace context body.

## Runtime Configuration

Required:

- `GUILD_API_TOKEN`: host-side Guild API token used by the bridge to call `https://app.guild.ai/api`.

Blaxel production:

- `GUILD_API_TOKEN` must be deployed as a Blaxel runtime secret.
- `GUILD_ALLOWED_WORKSPACE_FULL_NAMES` is committed in `blaxel.toml` as `michaelpreuss/guild-marketing-os`.
- `BRIDGE_API_TOKEN` should be left unset. Blaxel private endpoint auth is the production request gate.

Local testing:

- `BRIDGE_API_TOKEN`: optional local shared token. Accepted as `Authorization: Bearer <token>` or `X-API-Key`.
- `GUILD_ALLOWED_WORKSPACE_IDS`: comma-separated allow-list of workspace ids.
- `GUILD_ALLOWED_WORKSPACE_FULL_NAMES`: comma-separated allow-list such as `michaelpreuss/guild-marketing-os`.
- `GUILD_API_BASE_URL`: defaults to `https://app.guild.ai/api`.
- `HOST`: defaults to `0.0.0.0`.
- `PORT`: defaults to `8787`.

## Local Run

```sh
BRIDGE_API_TOKEN=local-bridge-token \
GUILD_API_TOKEN=<host-side-token> \
GUILD_ALLOWED_WORKSPACE_FULL_NAMES=michaelpreuss/guild-marketing-os \
npm start
```

Health check:

```sh
curl http://localhost:8787/health
```

## Blaxel Deploy

This package includes `blaxel.toml` for a private Blaxel agent-hosted HTTP bridge. The external paths remain:

- `GET /health`
- `POST /workspace-context/publish`

Deploy from this package directory with recursion disabled. Do not run `bl deploy -d services/workspace-context-publish-bridge` from the repo root; with current Blaxel CLI behavior that can package unrelated workspace files.

```sh
export BLAXEL_WORKSPACE=knicks

bl deploy --dryrun --recursive=false -w "$BLAXEL_WORKSPACE"
bl deploy \
  -w "$BLAXEL_WORKSPACE" \
  --recursive=false \
  -s GUILD_API_TOKEN="$GUILD_API_TOKEN"
```

Resolve and verify the private bridge URL with a long-lived Blaxel API key or service-account token:

```sh
export BLAXEL_BRIDGE_URL="$(bl get agent guild-marketing-os-workspace-context -w "$BLAXEL_WORKSPACE" -o json | node -e 'let s="";process.stdin.on("data",c=>s+=c);process.stdin.on("end",()=>{const j=JSON.parse(s); const item=Array.isArray(j)?j[0]:j; console.log(item.metadata?.url ?? item.url)})')"

curl -fsS \
  "$BLAXEL_BRIDGE_URL/health" \
  -H "Authorization: Bearer $BLAXEL_API_KEY" \
  -H "X-Blaxel-Workspace: $BLAXEL_WORKSPACE"
```

Unauthenticated `GET /health` should fail with `401` or `403`.

## Guild Integration Contract

Create or update the hosted Guild integration as:

- owner: `michaelpreuss`
- service/name: `guild-marketing-os-workspace-context`
- version: `1.0.1`
- base URL: the direct Blaxel bridge URL from `bl get agent guild-marketing-os-workspace-context`
- operation: `workspace_context_publish`
- method/path: `POST /workspace-context/publish`
- request schema: `schemas/publish-request.schema.json`
- response schema: `schemas/publish-response.schema.json`
- auth: API key mapped to `Authorization: Bearer {token}` with a long-lived Blaxel API key or service-account token

The Company Context Builder package version `1.0.25` calls this operation through `guildServiceTool("guild-marketing-os-workspace-context", { owner: "michaelpreuss", versionNumber: "1.0.1" })`.

## Test

```sh
npm test
```
