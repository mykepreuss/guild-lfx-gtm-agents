# Workspace Context Publish Bridge

Host-controlled bridge for the Company Context Builder workspace-context publish flow.

The deployed agent must not call raw internal Guild service endpoints. Instead, after the user has approved the company context and sent the exact confirmation phrase, the agent calls this bridge through the `michaelpreuss~guild-marketing-os-workspace-context@1.0.0` service contract.

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

The bridge uses the same supported API lifecycle as the Guild CLI workspace-context commands. It keeps Guild API credentials host-side; the agent sends only the managed compact context block and publish metadata.

## Runtime Configuration

Required:

- `GUILD_API_TOKEN`: host-side Guild API token used by the bridge to call `https://app.guild.ai/api`.

Recommended:

- `BRIDGE_API_TOKEN`: shared token expected from the Guild integration call to this bridge. Accepted as `Authorization: Bearer <token>` or `X-API-Key`.
- `GUILD_ALLOWED_WORKSPACE_IDS`: comma-separated allow-list of workspace ids.
- `GUILD_ALLOWED_WORKSPACE_FULL_NAMES`: comma-separated allow-list such as `michaelpreuss/guild-marketing-os`.
- `GUILD_API_BASE_URL`: defaults to `https://app.guild.ai/api`.
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

## Guild Integration Contract

Create or update the hosted Guild integration as:

- owner: `michaelpreuss`
- service/name: `guild-marketing-os-workspace-context`
- version: `1.0.0`
- base URL: the deployed bridge host
- operation: `workspace_context_publish`
- method/path: `POST /workspace-context/publish`
- request schema: `schemas/publish-request.schema.json`
- response schema: `schemas/publish-response.schema.json`
- auth: API key or bearer token mapped to `BRIDGE_API_TOKEN`

The Company Context Builder package version `1.0.24` calls this operation through `guildServiceTool("guild-marketing-os-workspace-context", { owner: "michaelpreuss", versionNumber: "1.0.0" })`.

## Test

```sh
npm test
```
