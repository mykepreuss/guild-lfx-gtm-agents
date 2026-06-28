#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const rootDir = process.cwd();
const fixturePath = path.join(rootDir, "scripts/fixtures/webflow-company-profile.md");
const fixture = fs.readFileSync(fixturePath, "utf8");
const foundationDir = path.join(rootDir, "agents/foundation-setup");

const build = spawnSync("npm", ["run", "build"], {
  cwd: foundationDir,
  encoding: "utf8",
  maxBuffer: 20 * 1024 * 1024,
});

if (build.status !== 0) {
  process.stderr.write(`${build.stdout ?? ""}${build.stderr ?? ""}`);
  process.exit(build.status ?? 1);
}

const { default: foundationAgent } = await import(path.join(foundationDir, "dist/agent.js"));

let state;
let createdContextBody = "";

const task = {
  sessionId: "session_test",
  console,
  llm: {
    async generateText() {
      return { text: "not json" };
    },
  },
  async save(nextState) {
    state = nextState;
  },
  async restore() {
    return state;
  },
  tools: {
    async guild_get_current_session() {
      return {
        id: "session_test",
        workspace: {
          id: "workspace_test",
          name: "guild-marketing-os",
          full_name: "michaelpreuss/guild-marketing-os",
        },
      };
    },
    async guild_get_workspace_context() {
      return {
        id: "workspace_test",
        name: "guild-marketing-os",
        full_name: "michaelpreuss/guild-marketing-os",
        context: {
          id: "context_old",
          compiled: "Existing compiled context",
          generated: "Generated context",
          manual: [
            "# Existing Workspace Context",
            "",
            "Keep this intro.",
            "",
            "<!-- guild-marketing-os-context:start -->",
            "old managed block",
            "<!-- guild-marketing-os-context:end -->",
            "",
            "Keep this outro.",
          ].join("\n"),
        },
      };
    },
    async guild_create_workspace_context(input) {
      createdContextBody = input.context;
      return { id: "context_draft", status: "DRAFT", manual_context: input.context, summary: input.summary };
    },
    async guild_publish_workspace_context(input) {
      return { id: input.context_id, status: "PUBLISHED", manual_context: createdContextBody, summary: "published" };
    },
  },
};

function guildChatEnvelope(text) {
  return JSON.stringify({
    type: "text",
    text: [
      "* This session was started at 18:50:27 (24h, UTC) on Sunday, June 28, 2026.",
      "* The current Guild workspace is named `guild-marketing-os` (Guild workspace_id 019f001c-cb37-3bb9-0000-31e5e134d4c3).",
      "* Guild frontend URL: https://app.guild.ai",
      "* The current user with whom you're interacting has Guild username `michaelpreuss` (Guild user_id 019cbabd-1669-0175-0000-6330e039ebd1).",
      "",
      "```json",
      "{",
      "  \"workspace_capabilities\": {",
      "    \"configured_integrations\": [",
      "      { \"service\": \"github\", \"status\": \"configured\" },",
      "      { \"service\": \"slack\", \"status\": \"configured\" }",
      "    ]",
      "  }",
      "}",
      "```",
      "",
      text,
    ].join("\n"),
  });
}

async function runPublishFlow(label, wrapInput) {
  state = undefined;
  createdContextBody = "";

  const first = await foundationAgent.start({ type: "text", text: wrapInput(fixture) }, task);
  assert.equal(first.type, "output", label);
  assert.match(first.output.text, /Company Context Approval Packet/, label);
  assert.match(first.output.text, /saved_to_workspace_context: false/, label);
  assert.equal(state.lastSourceText, fixture, `${label}: source text should preserve exact fixture`);

  const approval = await foundationAgent.start({ type: "text", text: wrapInput("Context approved save to workspace context") }, task);
  assert.equal(approval.type, "output", label);
  assert.match(approval.output.text, /approved_in_session: true/, label);
  assert.match(approval.output.text, /workspace_context_status: approved_pending_publish/, label);
  assert.match(approval.output.text, /publish approved context to workspace context/, label);
  assert.equal(state.approvedSourceText, fixture, `${label}: approved source text should preserve exact fixture`);

  const publish = await foundationAgent.start({ type: "text", text: wrapInput("publish approved context to workspace context") }, task);
  assert.equal(publish.type, "output", label);
  assert.match(publish.output.text, /saved_to_workspace_context: true/, label);
  assert.match(publish.output.text, /workspace_context_id: context_draft/, label);
  assert.equal(state.workspaceContextStatus, "published", label);
  assert.equal(state.workspaceContextId, "context_draft", label);
  assert.match(createdContextBody, /Keep this intro\./, label);
  assert.match(createdContextBody, /Keep this outro\./, label);
  assert.doesNotMatch(createdContextBody, /old managed block/, label);
  assert.doesNotMatch(createdContextBody, /This session was started/, label);
  assert.match(createdContextBody, /<!-- guild-marketing-os-context:start -->/, label);
  assert.match(createdContextBody, /<!-- guild-marketing-os-context:end -->/, label);
  assert.ok(createdContextBody.includes(fixture), `${label}: published managed block must preserve the exact approved source fixture`);
}

await runPublishFlow("direct input", (text) => text);
await runPublishFlow("Guild chat envelope input", guildChatEnvelope);

console.log("Foundation state/publish test OK.");
