#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const rootDir = process.cwd();
const args = parseArgs(process.argv.slice(2));
const workspace = args.workspace ?? process.env.GUILD_WORKSPACE ?? "michaelpreuss~guild-marketing-os";
const owner = args.owner ?? "michaelpreuss";
const keepTemp = args.keepTemp === true;
const dryRun = args.dryRun === true;
const skipVerify = args.skipVerify === true;

main().catch((error) => {
  console.error(`Publish failed: ${redact(String(error instanceof Error ? error.message : error))}`);
  process.exit(1);
});

async function main() {
  if (args.help) {
    printUsage();
    return;
  }

  assertRepoRoot();
  const catalog = readCatalog();
  const targets = resolveTargets(catalog);

  assertGitHubSourceReady();
  assertGuildReady();

  const message = args.message ?? defaultMessage();

  if (!skipVerify) run("npm", ["run", "verify"], { cwd: rootDir });

  console.log(`Publishing target: ${targets.map((target) => target.guildName).join(", ")}`);
  console.log(`Workspace check: ${workspace}`);
  console.log(`Mode: ${dryRun ? "dry run" : "publish"}`);

  for (const target of targets) {
    publishTarget(target, message);
  }
}

function publishTarget(target, message) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `guild-marketing-os-${target.id}-`));
  let cleanup = true;

  try {
    console.log(`\n== ${target.guildName} ==`);
    run("guild", ["agent", "clone", `${owner}~${target.guildName}`, "--directory", tempDir], { cwd: rootDir });
    syncPackageFiles(target.packageDir, tempDir);
    applyTargetOwnerBinding(target, tempDir);

    run("npm", ["install"], { cwd: tempDir });
    run("npm", ["run", "build"], { cwd: tempDir });

    const status = run("git", ["status", "--porcelain"], { cwd: tempDir, quiet: true }).stdout.trim();
    if (!status) {
      console.log("No Guild package changes to publish.");
      return;
    }

    if (dryRun) {
      console.log("Dry run complete; Guild package has publishable changes.");
      console.log(formatChangedFiles(status));
      return;
    }

    run("guild", ["agent", "save", "-A", "--message", message, "--no-bump", "--publish", "--wait"], { cwd: tempDir });
    verifyPublishedVersion(target);
  } catch (error) {
    cleanup = !keepTemp;
    if (keepTemp) console.error(`Kept temp clone for inspection: ${tempDir}`);
    throw error;
  } finally {
    if (cleanup) fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function applyTargetOwnerBinding(target, tempDir) {
  const packageJsonPath = path.join(tempDir, "package.json");
  const packageJson = readJson(packageJsonPath);
  packageJson.name = `@guildai/${owner}~${target.guildName}`;
  fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
  run("git", ["add", "--", "package.json"], { cwd: tempDir });

  if (target.id !== "launcher") return;

  const catalog = readCatalog();
  const capabilityPackages = (catalog.agents ?? []).map((candidate) => {
    const output = run(
      "guild",
      ["agent", "get", `${owner}~${candidate.guildName}`],
      { cwd: rootDir, quiet: true },
    ).stdout;
    const remoteAgent = JSON.parse(output);
    if (!remoteAgent.id || !remoteAgent.viewer_can_edit) {
      throw new Error(
        `Cannot bind Launcher to ${owner}~${candidate.guildName}: editable organization package not found.`,
      );
    }
    return {
      ...candidate,
      agentId: remoteAgent.id,
    };
  });

  const bindingPath = path.join(tempDir, "suite-binding.ts");
  fs.writeFileSync(
    bindingPath,
    renderLauncherSuiteBinding(owner, capabilityPackages),
  );
  run("git", ["add", "--", "suite-binding.ts"], { cwd: tempDir });
}

function renderLauncherSuiteBinding(bindingOwner, capabilityPackages) {
  const routeById = {
    "foundation-setup": "company_context",
    "market-signal": "market_signal",
    icp: "icp",
    "audience-segmentation": "audience_segmentation",
    messaging: "messaging",
    "branding-pitch-deck": "branding_pitch_deck",
    "social-monitoring-content": "social_monitoring_content",
    "campaigns-paid-media": "campaigns_paid_media",
  };
  const records = capabilityPackages.map((candidate) => {
    const route = routeById[candidate.id];
    if (!route) {
      throw new Error(`No Launcher route binding exists for ${candidate.id}.`);
    }
    return [
      `  ${route}: {`,
      `    packageName: ${JSON.stringify(candidate.guildName)},`,
      `    qualifiedName: ${JSON.stringify(`${bindingOwner}~${candidate.guildName}`)},`,
      `    agentId: ${JSON.stringify(candidate.agentId)},`,
      "  },",
    ].join("\n");
  });
  return [
    "export const suitePackageBindings = {",
    ...records,
    "} as const;",
    "",
  ].join("\n");
}

function syncPackageFiles(packageDir, tempDir) {
  clearTempPackage(tempDir);
  const trackedFiles = run("git", ["ls-files", packageDir], { cwd: rootDir, quiet: true }).stdout
    .split("\n")
    .map((file) => file.trim())
    .filter(Boolean)
    .filter((file) => shouldCopyPackageFile(packageDir, file));

  if (!trackedFiles.length) {
    throw new Error(`No tracked package files found for ${packageDir}.`);
  }

  const copiedFiles = [];
  for (const file of trackedFiles) {
    const relative = path.relative(packageDir, file);
    const source = path.join(rootDir, file);
    const destination = path.join(tempDir, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
    copiedFiles.push(relative);
  }

  // `guild agent save --all` intentionally ignores untracked files. Stage the
  // exact monorepo-owned package files so newly added modules are included in
  // the Guild version without staging generated guild.json or local metadata.
  run("git", ["add", "--", ...copiedFiles], { cwd: tempDir });
}

function clearTempPackage(tempDir) {
  for (const entry of fs.readdirSync(tempDir)) {
    if ([".git", ".gitignore", ".guild", ".npmrc", "guild.json", "markdown.d.ts", "node_modules"].includes(entry)) continue;
    fs.rmSync(path.join(tempDir, entry), { recursive: true, force: true });
  }
}

function shouldCopyPackageFile(packageDir, file) {
  const relative = path.relative(packageDir, file);
  if (!relative || relative.startsWith("..")) return false;
  const parts = relative.split(path.sep);
  return ![
    "guild.json",
    "node_modules",
    "dist",
    ".guild",
    ".npmrc",
    "package-lock.json",
    "agent.js.gz",
    "tsconfig.tsbuildinfo",
  ].some((blocked) => parts.includes(blocked));
}

function verifyPublishedVersion(target) {
  const packageJson = readJson(path.join(rootDir, target.packageDir, "package.json"));
  const output = run("guild", ["agent", "get", `${owner}~${target.guildName}`], { cwd: rootDir, quiet: true }).stdout;
  const agent = JSON.parse(output);
  const published = agent.latest_published_version;

  if (published?.status !== "PUBLISHED") {
    throw new Error(`${target.guildName} latest version is not published.`);
  }

  if (published.version_number !== packageJson.version) {
    throw new Error(
      `${target.guildName} published version ${published.version_number} does not match source package version ${packageJson.version}.`,
    );
  }

  console.log(`Published ${target.guildName} ${published.version_number} (${published.id}).`);

  const workspaceList = run("guild", ["workspace", "agent", "list", "--workspace", workspace], { cwd: rootDir, quiet: true }).stdout;
  if (!workspaceList.includes(`${owner}~${target.guildName}`) || !workspaceList.includes(packageJson.version)) {
    console.log("Workspace list did not clearly show the new version; check auto-update or reinstall state in Guild.");
    console.log(redact(workspaceList));
  }
}

function assertRepoRoot() {
  const packageJsonPath = path.join(rootDir, "package.json");
  if (!fs.existsSync(packageJsonPath)) throw new Error("Run this command from the marketing-os repository root.");
  const packageJson = readJson(packageJsonPath);
  if (packageJson.name !== "guild-marketing-os-agents") {
    throw new Error("Run this command from the marketing-os repository root, not an agent package or Guild clone.");
  }
}

function assertGitHubSourceReady() {
  const status = run("git", ["status", "--porcelain"], { cwd: rootDir, quiet: true }).stdout.trim();
  if (status) {
    throw new Error("GitHub source repo has uncommitted changes. Commit or stash them before publishing to Guild.");
  }

  const branch = run("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: rootDir, quiet: true }).stdout.trim();
  if (!branch || branch === "HEAD") throw new Error("Refusing to publish from a detached HEAD.");

  const upstream = run("git", ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], {
    cwd: rootDir,
    quiet: true,
    allowFailure: true,
  }).stdout.trim();
  if (!upstream) throw new Error(`Branch ${branch} has no upstream. Push/set upstream before publishing to Guild.`);

  const unpushed = run("git", ["log", `${upstream}..HEAD`, "--oneline"], { cwd: rootDir, quiet: true }).stdout.trim();
  if (unpushed) throw new Error("GitHub source repo has unpushed commits. Push to GitHub before publishing to Guild.");

  const behind = run("git", ["log", `HEAD..${upstream}`, "--oneline"], { cwd: rootDir, quiet: true }).stdout.trim();
  if (behind) throw new Error("GitHub source repo is behind upstream. Pull/rebase before publishing to Guild.");

  const remote = run("git", ["remote", "get-url", "origin"], { cwd: rootDir, quiet: true }).stdout.trim();
  if (!/github\.com[:/]/.test(remote)) {
    throw new Error("Expected the monorepo origin to be GitHub. Guild publishing must happen only through a temp Guild clone.");
  }
}

function assertGuildReady() {
  run("guild", ["auth", "status"], { cwd: rootDir });
  run("guild", ["doctor"], { cwd: rootDir });
}

function resolveTargets(catalog) {
  const packages = dedupePackages([...(catalog.agents ?? []), catalog.entrypoint].filter(Boolean));
  if (args.all) return packages;

  const selector = args.agent;
  if (!selector) {
    throw new Error("Missing --agent <id|guildName|packageDir>. Use --all to publish every package with changes.");
  }

  const target = packages.find((candidate) =>
    [candidate.id, candidate.guildName, candidate.packageDir, candidate.displayName].includes(selector),
  );
  if (!target) throw new Error(`Unknown agent selector: ${selector}`);
  return [target];
}

function dedupePackages(packages) {
  const seen = new Set();
  return packages.filter((candidate) => {
    const key = [candidate.id, candidate.guildName, candidate.packageDir].filter(Boolean).join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function readCatalog() {
  return readJson(path.join(rootDir, "agents", "catalog.json"));
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function run(command, commandArgs, { cwd, quiet = false, allowFailure = false } = {}) {
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
    throw new Error(`${command} ${commandArgs.join(" ")} failed with exit code ${result.status}\n${stderr || stdout}`);
  }

  return { stdout, stderr, status: result.status };
}

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--help" || value === "-h") parsed.help = true;
    else if (value === "--all") parsed.all = true;
    else if (value === "--dry-run") parsed.dryRun = true;
    else if (value === "--keep-temp") parsed.keepTemp = true;
    else if (value === "--skip-verify") parsed.skipVerify = true;
    else if (value === "--agent") parsed.agent = values[++index];
    else if (value === "--message" || value === "-m") parsed.message = values[++index];
    else if (value === "--workspace") parsed.workspace = values[++index];
    else if (value === "--owner") parsed.owner = values[++index];
    else throw new Error(`Unknown argument: ${value}`);
  }
  return parsed;
}

function defaultMessage() {
  return run("git", ["log", "-1", "--pretty=%s"], { cwd: rootDir, quiet: true }).stdout.trim() || "Publish Guild agent";
}

function formatChangedFiles(status) {
  return status
    .split("\n")
    .filter(Boolean)
    .map((line) => `  ${line}`)
    .join("\n");
}

function redact(value) {
  return value
    .replace(/https:\/\/x-access-token:[^@\s]+@/g, "https://x-access-token:<redacted>@")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, "Bearer <redacted>");
}

function printUsage() {
  console.log(`
Usage:
  npm run publish:guild-agent -- --agent foundation-setup --message "Publish company context builder updates"
  npm run publish:guild-agent -- --all --message "Publish Guild Marketing OS agents"
  npm run publish:guild-agent -- --agent foundation-setup --owner <organization> --workspace <organization>/<workspace> --dry-run

This command must run from the GitHub monorepo root after changes are committed and pushed.
It publishes through a temporary Guild clone so the monorepo remote is never used as a Guild agent remote.
Internally, it runs guild agent clone and guild agent save only from that temporary Guild clone.
For a non-default owner, package metadata is rebound to that owner. Launcher
publishing also resolves the eight editable capability package IDs and emits a
static owner-specific allowlist into the temporary Guild clone.
`.trim());
}
