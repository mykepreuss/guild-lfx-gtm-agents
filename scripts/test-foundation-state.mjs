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

const first = await foundationAgent.start({ type: "text", text: fixture }, task);
assert.equal(first.type, "output");
assert.match(first.output.text, /Company Context Approval Packet/);
assert.match(first.output.text, /saved_to_workspace_context: false/);
assert.equal(state.lastSourceText, fixture);

const approval = await foundationAgent.start({ type: "text", text: "Context approved save to workspace context" }, task);
assert.equal(approval.type, "output");
assert.match(approval.output.text, /approved_in_session: true/);
assert.match(approval.output.text, /workspace_context_status: approved_pending_publish/);
assert.match(approval.output.text, /publish approved context to workspace context/);
assert.equal(state.approvedSourceText, fixture);

const publish = await foundationAgent.start({ type: "text", text: "publish approved context to workspace context" }, task);
assert.equal(publish.type, "output");
assert.match(publish.output.text, /saved_to_workspace_context: true/);
assert.match(publish.output.text, /workspace_context_id: context_draft/);
assert.equal(state.workspaceContextStatus, "published");
assert.equal(state.workspaceContextId, "context_draft");
assert.match(createdContextBody, /Keep this intro\./);
assert.match(createdContextBody, /Keep this outro\./);
assert.doesNotMatch(createdContextBody, /old managed block/);
assert.match(createdContextBody, /<!-- guild-marketing-os-context:start -->/);
assert.match(createdContextBody, /<!-- guild-marketing-os-context:end -->/);
assert.ok(createdContextBody.includes(fixture), "published managed block must preserve the exact approved source fixture");

console.log("Foundation state/publish test OK.");
