#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log("Usage: node scripts/capture-guild-evidence.mjs --session <session-id> --workspace <owner/workspace> [--output-dir <dir>] [--stdout]");
  process.exit(0);
}

const workspace = args.workspace ?? process.env.GUILD_WORKSPACE;
const sessionId = args.session;
const outputDir = path.resolve(args.outputDir ?? "_private/evidence");

if (!sessionId || !workspace) {
  console.error("Both --session and --workspace are required (GUILD_WORKSPACE may provide the workspace).");
  process.exit(1);
}

const capturedAt = new Date().toISOString();
const evidence = {
  schema_version: "1.0",
  captured_at: capturedAt,
  workspace,
  workspace_current: guildJson(["workspace", "current"]),
  installed_agents: guildJson(["workspace", "agent", "list", "--workspace", workspace, "--limit", "100"]),
  context_versions: guildJson(["workspace", "context", "list", workspace, "--limit", "20"]),
  session: guildJson(["session", "get", sessionId]),
  tasks: guildJson(["session", "tasks", sessionId]),
  events: guildJson(["session", "events", sessionId]),
};

const serialized = `${JSON.stringify(evidence, null, 2)}\n`;
if (args.stdout) {
  process.stdout.write(serialized);
} else {
  fs.mkdirSync(outputDir, { recursive: true });
  const safeTimestamp = capturedAt.replace(/[:.]/g, "-");
  const outputPath = path.join(outputDir, `${safeTimestamp}-${sessionId}.json`);
  fs.writeFileSync(outputPath, serialized, { mode: 0o600 });
  console.log(`Captured Guild evidence: ${outputPath}`);
}

function guildJson(commandArgs) {
  const result = spawnSync("guild", ["--mode", "json", ...commandArgs], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(`guild ${commandArgs.join(" ")} failed: ${(result.stderr || result.stdout).trim()}`);
  }
  return JSON.parse(result.stdout);
}

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--session") parsed.session = values[++index];
    else if (value === "--workspace") parsed.workspace = values[++index];
    else if (value === "--output-dir") parsed.outputDir = values[++index];
    else if (value === "--stdout") parsed.stdout = true;
    else if (value === "--help" || value === "-h") parsed.help = true;
    else throw new Error(`Unknown argument: ${value}`);
  }
  return parsed;
}
