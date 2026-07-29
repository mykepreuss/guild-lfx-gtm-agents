#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const rootDir = process.cwd();
const args = parseArgs(process.argv.slice(2));
const exactConfirmation = "publish private organization rehearsal suite";

main().catch((error) => {
  console.error(
    `Private rehearsal bootstrap failed: ${redact(
      String(error instanceof Error ? error.message : error),
    )}`,
  );
  process.exit(1);
});

async function main() {
  if (args.help) {
    printUsage();
    return;
  }

  assertRepoReady();
  const owner = required(args.owner, "--owner");
  const workspace = required(args.workspace, "--workspace");
  const catalog = readJson(path.join(rootDir, "agents", "catalog.json"));
  const capabilityPackages = catalog.agents ?? [];
  const launcher = catalog.entrypoint;

  if (!launcher || launcher.id !== "launcher") {
    throw new Error("Catalog must declare Marketing OS Launcher as the entrypoint.");
  }
  if (capabilityPackages.length !== 8) {
    throw new Error(
      `Expected exactly eight capability packages; found ${capabilityPackages.length}.`,
    );
  }

  assertOwnerAvailable(owner);
  assertWorkspaceOwner(workspace, owner);
  assertWorkspaceEmpty(workspace);

  const capabilityRecords = capabilityPackages.map((candidate) =>
    requirePrivateEditableAgent(owner, candidate),
  );
  const launcherRecord = readAgent(`${owner}~${launcher.guildName}`, true);

  if (
    launcherRecord &&
    (!launcherRecord.viewer_can_edit || launcherRecord.is_public)
  ) {
    throw new Error(
      `Existing ${owner}~${launcher.guildName} must be editable and private.`,
    );
  }

  printPlan({
    owner,
    workspace,
    launcher,
    launcherRecord,
    capabilityRecords,
  });

  if (!args.execute) {
    console.log(
      "\nPreview only. No agent was created, saved, published, installed, or made public.",
    );
    console.log(
      `To execute after organization-owner authorization, add --execute --confirm "${exactConfirmation}".`,
    );
    return;
  }

  if (args.confirm !== exactConfirmation) {
    throw new Error(
      `Execution requires the exact confirmation: ${exactConfirmation}`,
    );
  }

  if (!launcherRecord) {
    createPrivateLauncher(owner, launcher);
  }

  run(
    process.execPath,
    [
      path.join(rootDir, "scripts", "publish-guild-agent.mjs"),
      "--all",
      "--owner",
      owner,
      "--workspace",
      workspace,
      "--message",
      args.message ?? "Publish private organization rehearsal suite",
    ],
    { cwd: rootDir },
  );

  for (const candidate of [...capabilityPackages, launcher]) {
    const qualifiedName = `${owner}~${candidate.guildName}`;
    run("guild", ["agent", "update", qualifiedName, "--private"], {
      cwd: rootDir,
    });
    const record = readAgent(qualifiedName);
    const expectedVersion = readJson(
      path.join(rootDir, candidate.packageDir, "package.json"),
    ).version;
    if (record.is_public) {
      throw new Error(`${qualifiedName} unexpectedly became public.`);
    }
    if (
      record.latest_published_version?.status !== "PUBLISHED" ||
      record.latest_published_version?.version_number !== expectedVersion
    ) {
      throw new Error(
        `${qualifiedName} did not publish expected private version ${expectedVersion}.`,
      );
    }
  }

  assertWorkspaceEmpty(workspace);

  console.log("\nPrivate organization rehearsal suite is ready in Agent Hub.");
  console.log(
    "No agent was installed and no workspace default or Workspace Context was changed.",
  );
  console.log(
    "Next action: install the private organization Launcher through Guild UI, then continue one-at-a-time onboarding.",
  );
}

function assertRepoReady() {
  const packageJson = readJson(path.join(rootDir, "package.json"));
  if (packageJson.name !== "guild-marketing-os-agents") {
    throw new Error("Run from the marketing-os repository root.");
  }

  const status = run("git", ["status", "--porcelain"], {
    cwd: rootDir,
    quiet: true,
  }).stdout.trim();
  if (status) {
    throw new Error(
      "Commit or discard local changes before preparing shared Guild assets.",
    );
  }

  const upstream = run(
    "git",
    ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"],
    { cwd: rootDir, quiet: true, allowFailure: true },
  ).stdout.trim();
  if (!upstream) {
    throw new Error(
      "Current branch must have an upstream before preparing shared Guild assets.",
    );
  }

  const unpushed = run("git", ["log", `${upstream}..HEAD`, "--oneline"], {
    cwd: rootDir,
    quiet: true,
  }).stdout.trim();
  const behind = run("git", ["log", `HEAD..${upstream}`, "--oneline"], {
    cwd: rootDir,
    quiet: true,
  }).stdout.trim();
  if (unpushed || behind) {
    throw new Error("Current branch and upstream must be synchronized.");
  }

  run("guild", ["auth", "status"], { cwd: rootDir, quiet: true });
}

function assertOwnerAvailable(owner) {
  const owners = run("guild", ["agent", "owners"], {
    cwd: rootDir,
    quiet: true,
  }).stdout;
  if (!owners.includes(owner)) {
    throw new Error(
      `${owner} is not available as an agent owner for this account.`,
    );
  }
}

function assertWorkspaceOwner(workspace, owner) {
  const output = run("guild", ["workspace", "get", workspace], {
    cwd: rootDir,
    quiet: true,
  }).stdout;
  const record = JSON.parse(output);
  if (record.owner?.name !== owner) {
    throw new Error(
      `Workspace ${workspace} belongs to ${record.owner?.name ?? "an unknown owner"}, not ${owner}.`,
    );
  }
}

function assertWorkspaceEmpty(workspace) {
  const installed = run(
    "guild",
    ["workspace", "agent", "list", "--workspace", workspace],
    { cwd: rootDir, quiet: true },
  ).stdout;
  if (!/No agents installed in this workspace/i.test(installed)) {
    throw new Error(
      "Clean rehearsal workspace is no longer empty; stop before browser onboarding.",
    );
  }
}

function requirePrivateEditableAgent(owner, candidate) {
  const record = readAgent(`${owner}~${candidate.guildName}`);
  if (!record.viewer_can_edit) {
    throw new Error(
      `${record.full_name} is not editable by the authenticated account.`,
    );
  }
  if (record.is_public) {
    throw new Error(
      `${record.full_name} is public; rehearsal packages must remain private.`,
    );
  }
  return {
    id: candidate.id,
    guildName: candidate.guildName,
    agentId: record.id,
    publishedVersion:
      record.latest_published_version?.version_number ?? "none",
  };
}

function readAgent(qualifiedName, allowMissing = false) {
  const result = run("guild", ["agent", "get", qualifiedName], {
    cwd: rootDir,
    quiet: true,
    allowFailure: allowMissing,
  });
  if (result.status !== 0) return null;
  return JSON.parse(result.stdout);
}

function createPrivateLauncher(owner, launcher) {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "guild-marketing-os-org-launcher-"),
  );
  try {
    run(
      "guild",
      [
        "agent",
        "init",
        "--owner",
        owner,
        "--name",
        launcher.guildName,
        "--agent-type",
        "GUILD_TYPESCRIPT",
        "--template",
        "BLANK",
        "--category",
        "sales-marketing",
        "--directory",
        tempDir,
      ],
      { cwd: rootDir },
    );
    run(
      "guild",
      ["agent", "update", `${owner}~${launcher.guildName}`, "--private"],
      { cwd: rootDir },
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function printPlan({
  owner,
  workspace,
  launcher,
  launcherRecord,
  capabilityRecords,
}) {
  console.log("Guild-only private rehearsal plan");
  console.log(`Owner: ${owner}`);
  console.log(`Workspace: ${workspace}`);
  console.log("Visibility: private");
  console.log("\nCapability packages:");
  for (const record of capabilityRecords) {
    console.log(
      `- ${owner}~${record.guildName} (${record.agentId}); current published version: ${record.publishedVersion}`,
    );
  }
  console.log(
    `\nLauncher: ${owner}~${launcher.guildName} — ${
      launcherRecord
        ? `reuse private agent ${launcherRecord.id}`
        : "create one new private organization agent"
    }`,
  );
  console.log(
    "Publish order: eight capability packages first, Launcher last with a generated static eight-agent allowlist.",
  );
  console.log(
    "Not included: installation, default-agent change, Workspace Context publication, public visibility, credentials, or external marketing action.",
  );
}

function run(
  command,
  commandArgs,
  { cwd, quiet = false, allowFailure = false } = {},
) {
  const result = spawnSync(command, commandArgs, {
    cwd,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  const stdout = redact(result.stdout ?? "");
  const stderr = redact(result.stderr ?? "");
  if (!quiet && stdout) process.stdout.write(stdout);
  if (!quiet && stderr) process.stderr.write(stderr);
  if (result.error && !allowFailure) throw result.error;
  if (result.status !== 0 && !allowFailure) {
    throw new Error(
      `${command} ${commandArgs.join(" ")} failed with exit code ${result.status}\n${stderr || stdout}`,
    );
  }
  return { stdout, stderr, status: result.status };
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function required(value, flag) {
  if (!value) throw new Error(`Missing required ${flag}.`);
  return value;
}

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--help" || value === "-h") parsed.help = true;
    else if (value === "--execute") parsed.execute = true;
    else if (value === "--owner") parsed.owner = values[++index];
    else if (value === "--workspace") parsed.workspace = values[++index];
    else if (value === "--confirm") parsed.confirm = values[++index];
    else if (value === "--message" || value === "-m") {
      parsed.message = values[++index];
    } else {
      throw new Error(`Unknown argument: ${value}`);
    }
  }
  return parsed;
}

function redact(value) {
  return value
    .replace(
      /https:\/\/x-access-token:[^@\s]+@/g,
      "https://x-access-token:<redacted>@",
    )
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, "Bearer <redacted>");
}

function printUsage() {
  console.log(
    `
Usage:
  npm run bootstrap:guild-private-rehearsal -- --owner <organization> --workspace <organization>/<workspace>

Preview is the default and performs no Guild mutation.

Execution additionally requires:
  --execute --confirm "${exactConfirmation}"

Execution creates the missing private organization Launcher when needed,
publishes the eight private capability packages first, publishes Launcher last
with an exact static allowlist, and verifies that the clean workspace is still
empty. Browser installation and onboarding remain separate acceptance steps.
`.trim(),
  );
}
