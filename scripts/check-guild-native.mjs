#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const rootDir = process.cwd();
const contextOnly = process.argv.includes("--context");
const errors = [];
const packageOwner = "michaelpreuss";
const scopedPackagePrefix = `@guildai/${packageOwner}~`;
const ignoredWalkEntries = new Set(["node_modules", ".git", "dist"]);

const requiredContextFiles = [
  "README.md",
  "project-context.md",
  "messaging-source.md",
  "brand-kit.md",
  "audience-segments.md",
  "channel-registry.md",
  "proof-and-constraints.md",
  "dashboard-signals.md",
];

const publicScanRoots = [
  ".gitignore",
  ".npmrc",
  "AGENTS.md",
  "CONTRIBUTING.md",
  "package.json",
  "README.md",
  "agents",
  "context-hub",
  "guild-skills",
  "scripts",
  "workspace-context",
];

const blockedPatterns = [
  { pattern: /\/Users\//, label: "absolute local user path" },
  { pattern: /\bmp-hq\b/i, label: "private adjacent repo reference" },
  { pattern: /\bgtm-system\b/i, label: "private example repo reference" },
  { pattern: /\bmade-gtm-knowledge-graph\b/i, label: "private example repo reference" },
  { pattern: /\bmichael-2026-jun-1-gtm-strategy-overview-draft\b/i, label: "private source filename" },
  { pattern: /(?<!guild-)marketing-os-[a-z0-9-]+/i, label: "old Marketing OS package prefix" },
];

const expectedAgentIds = [
  "foundation-setup",
  "market-signal",
  "icp",
  "audience-segmentation",
  "messaging",
  "branding-pitch-deck",
  "social-monitoring-content",
  "campaigns-paid-media",
];

const requiredAgentPackageFiles = ["README.md", "agent.ts", "package.json", "tsconfig.json", "guild.json"];
const requiredGuildSdkVersion = "0.2.58";
const requiredDevDependencies = {
  esbuild: "0.28.0",
  typescript: "5.0.4",
};
const requiredReviewAgentSourceSnippets = [
  "useWorkspaceAgents: false",
  "Every substantial response must use these exact Markdown headings in this order:",
  "## Consumed Context",
  "## Produced Artifact",
  "## Assumptions And Missing Evidence",
  "## Approval Gate",
  "## AEO / AI-Readiness Contribution",
  "## Status Payload",
  "## Downstream Handoff",
  "Do not rename, remove, or reorder these headings.",
];
const requiredStructuredFoundationSnippets = [
  "agent({",
  "inputSchema",
  "outputSchema",
  "task.llm.generateText",
  "parseJsonObject",
  "enforceDeterministicGuards",
  "renderMarkdownPacket",
  "forbiddenLiveActionClaims",
  "markdownPacket",
  "## Consumed Context",
  "## Produced Artifact",
  "## Assumptions And Missing Evidence",
  "## Approval Gate",
  "## AEO / AI-Readiness Contribution",
  "## Status Payload",
  "## Downstream Handoff",
];

function fail(message) {
  errors.push(message);
}

function exists(relativePath) {
  return fs.existsSync(path.join(rootDir, relativePath));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function readJson(relativePath) {
  try {
    return JSON.parse(readText(relativePath));
  } catch (error) {
    fail(`${relativePath} is not valid JSON: ${error.message}`);
    return undefined;
  }
}

function walkFiles(relativePath) {
  const fullPath = path.join(rootDir, relativePath);
  if (!fs.existsSync(fullPath)) return [];
  const stat = fs.statSync(fullPath);
  if (stat.isFile()) return [relativePath];

  const files = [];
  for (const entry of fs.readdirSync(fullPath)) {
    if (ignoredWalkEntries.has(entry)) continue;
    files.push(...walkFiles(path.join(relativePath, entry)));
  }
  return files;
}

function scanPublicFiles() {
  const files = publicScanRoots.flatMap(walkFiles);
  for (const file of files) {
    const content = readText(file);
    const lines = content.split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const { pattern, label } of blockedPatterns) {
        if (pattern.test(line)) {
          fail(`${file}:${index + 1} contains ${label}.`);
        }
      }
    });
  }
}

function validateContextHub() {
  if (!exists("context-hub")) {
    fail("context-hub/ is missing.");
    return;
  }

  for (const file of requiredContextFiles) {
    const relativePath = path.join("context-hub", file);
    if (!exists(relativePath)) {
      fail(`${relativePath} is missing.`);
      continue;
    }

    const content = readText(relativePath);
    if (!content.startsWith("# ")) {
      fail(`${relativePath} must start with an H1 heading.`);
    }
    if (!/Status:/i.test(content)) {
      fail(`${relativePath} must include a Status line.`);
    }
  }
}

function validateAgentCatalog() {
  if (!exists("agents/catalog.json")) {
    fail("agents/catalog.json is missing.");
    return;
  }

  const catalog = readJson("agents/catalog.json");
  if (!catalog) return;

  if (catalog.phase !== "guild-native-phase-1") {
    fail("agents/catalog.json phase must be guild-native-phase-1.");
  }
  if (!Array.isArray(catalog.agents) || catalog.agents.length !== expectedAgentIds.length) {
    fail("agents/catalog.json must include the eight-agent V1 suite.");
    return;
  }

  catalog.agents.forEach((agent, index) => {
    if (agent.id !== expectedAgentIds[index]) {
      fail(`agents/catalog.json agent ${index + 1} must be ${expectedAgentIds[index]}.`);
    }
    if (agent.phaseOrder !== index + 1) {
      fail(`${agent.id ?? `agent ${index + 1}`} phaseOrder must be ${index + 1}.`);
    }
  });

  const ids = new Set();
  const guildNames = new Set();

  for (const agent of catalog.agents) {
    if (!agent.id) fail("Every catalog agent must include id.");
    if (!agent.guildName) fail(`${agent.id ?? "unknown agent"} must include guildName.`);
    if (agent.guildName && !agent.guildName.startsWith("guild-marketing-os-")) {
      fail(`${agent.id ?? "unknown agent"} guildName must start with guild-marketing-os-.`);
    }
    if (!agent.displayName) fail(`${agent.id ?? "unknown agent"} must include displayName.`);
    if (!agent.description) fail(`${agent.id ?? "unknown agent"} must include description.`);
    if (!agent.contextHub) fail(`${agent.id ?? "unknown agent"} must include contextHub.`);
    if (!agent.packageDir) fail(`${agent.id ?? "unknown agent"} must include packageDir.`);

    if (ids.has(agent.id)) fail(`Duplicate agent id: ${agent.id}.`);
    ids.add(agent.id);

    if (guildNames.has(agent.guildName)) fail(`Duplicate guildName: ${agent.guildName}.`);
    guildNames.add(agent.guildName);

    const requiredArtifacts = agent.contextHub?.requiredArtifacts;
    const optionalArtifacts = agent.contextHub?.optionalArtifacts ?? [];
    if (!Array.isArray(requiredArtifacts) || requiredArtifacts.length === 0) {
      fail(`${agent.id} must declare required approved context artifacts.`);
    }
    if (!Array.isArray(optionalArtifacts)) {
      fail(`${agent.id} optionalArtifacts must be an array.`);
    }

    for (const artifact of [...(requiredArtifacts ?? []), ...optionalArtifacts]) {
      const artifactPath = path.join("context-hub", `${artifact}.md`);
      if (!exists(artifactPath)) {
        fail(`${agent.id} references missing approved context artifact ${artifactPath}.`);
      }
    }
  }

  if (!ids.has("foundation-setup")) fail("agents/catalog.json must include foundation-setup.");
}

function validateAgentPackage(agent) {
  const packageDir = agent.packageDir;

  if (!packageDir.startsWith("agents/")) {
    fail(`${agent.id} packageDir must stay under agents/.`);
  }

  if (!exists(packageDir)) {
    fail(`${packageDir}/ is missing.`);
    return;
  }

  for (const file of requiredAgentPackageFiles) {
    if (!exists(path.join(packageDir, file))) {
      fail(`${packageDir}/${file} is missing.`);
    }
  }

  const packageJsonPath = path.join(packageDir, "package.json");
  if (exists(packageJsonPath)) {
    const packageJson = readJson(packageJsonPath);
    const allowedPackageNames = [
      agent.guildName,
      `${scopedPackagePrefix}${agent.guildName}`,
    ];
    if (packageJson && !allowedPackageNames.includes(packageJson.name)) {
      fail(`${packageJsonPath} name must be ${allowedPackageNames.join(" or ")}.`);
    }
    if (packageJson?.dependencies?.["@guildai/agents-sdk"] !== requiredGuildSdkVersion) {
      fail(`${packageJsonPath} must pin @guildai/agents-sdk to ${requiredGuildSdkVersion}.`);
    }
    if (agent.id === "foundation-setup" && packageJson?.dependencies?.zod !== "4.4.3") {
      fail(`${packageJsonPath} must pin zod to 4.4.3 for the structured foundation agent.`);
    }
    for (const [dependency, version] of Object.entries(requiredDevDependencies)) {
      if (packageJson?.devDependencies?.[dependency] !== version) {
        fail(`${packageJsonPath} must pin ${dependency} to ${version}.`);
      }
    }
  }

  const guildJsonPath = path.join(packageDir, "guild.json");
  if (exists(guildJsonPath)) {
    const guildJson = readJson(guildJsonPath);
    if (guildJson && guildJson.name !== agent.guildName) {
      fail(`${guildJsonPath} name must match catalog guildName ${agent.guildName}.`);
    }
    if (guildJson && typeof guildJson.agent_id !== "string") {
      fail(`${guildJsonPath} must include generated agent_id.`);
    }
  }

  if (exists(path.join(packageDir, "agent.ts"))) {
    const source = readText(path.join(packageDir, "agent.ts"));
    if (!source.includes("@guildai/agents-sdk")) {
      fail(`${packageDir}/agent.ts should use the Guild Agent SDK.`);
    }
    if (!source.includes("identifier:")) {
      fail(`${packageDir}/agent.ts must declare a Guild SDK identifier.`);
    }

    const requiredSnippets = agent.id === "foundation-setup"
      ? requiredStructuredFoundationSnippets
      : requiredReviewAgentSourceSnippets;
    for (const snippet of requiredSnippets) {
      if (!source.includes(snippet)) {
        fail(`${packageDir}/agent.ts must include required V1 contract snippet: ${snippet}`);
      }
    }
    if (agent.id === "foundation-setup" && !source.includes('from "zod"')) {
      fail(`${packageDir}/agent.ts must import zod for structured validation.`);
    }
    if (agent.id === "foundation-setup" && source.includes("llmAgent(")) {
      fail(`${packageDir}/agent.ts must use the structured agent() implementation.`);
    }
    if (/skillsTools|guildTools|mode:\s*["']multi-turn["']|local-agent-lab|agent-hub-exemplars|local-demo-packets/.test(source)) {
      fail(`${packageDir}/agent.ts must use the current Guild-validating one-shot SDK shape.`);
    }
  }
}

function validateAgentPackages() {
  const catalog = readJson("agents/catalog.json");
  if (!catalog || !Array.isArray(catalog.agents)) return;

  for (const agent of catalog.agents) {
    validateAgentPackage(agent);
  }
}

function validateWorkspaceContext() {
  const file = "workspace-context/guild-marketing-os-workspace-context.md";
  if (!exists(file)) {
    fail(`${file} is missing.`);
    return;
  }

  const content = readText(file);
  if (!content.startsWith("# ")) {
    fail(`${file} must start with an H1 heading.`);
  }
  if (!/Status:/i.test(content)) {
    fail(`${file} must include a Status line.`);
  }

  const lines = content.split(/\r?\n/);
  if (lines.length > 120) {
    fail(`${file} should stay concise for always-on Guild workspace context.`);
  }
}

function validateSkillSource() {
  const file = "guild-skills/guild-marketing-os-foundation-method.md";
  if (!exists(file)) {
    fail(`${file} is missing.`);
    return;
  }

  const content = readText(file);
  if (!content.startsWith("# ")) {
    fail(`${file} must start with an H1 heading.`);
  }
  if (!/Status:/i.test(content)) {
    fail(`${file} must include a Status line.`);
  }
}

function validateRemovedLocalLab() {
  const removedPaths = [
    "work/local-agent-lab",
    "work/agent-hub-exemplars",
    "local-demo-packets",
  ];

  for (const relativePath of removedPaths) {
    if (exists(relativePath)) {
      fail(`${relativePath}/ should not exist in Guild-native Phase 1.`);
    }
  }
}

function validateTestHarness() {
  const file = "scripts/run-guild-e2e.mjs";
  if (!exists(file)) {
    fail(`${file} is missing.`);
    return;
  }

  const content = readText(file);
  for (const snippet of ["smokeCases", "adversarialCases", "Test complete", "requiredHeadings", "contextArtifacts", "statusPayload", "markdownPacket"]) {
    if (!content.includes(snippet)) {
      fail(`${file} must include ${snippet}.`);
    }
  }
}

validateContextHub();
validateAgentCatalog();
scanPublicFiles();

if (!contextOnly) {
  validateAgentPackages();
  validateWorkspaceContext();
  validateSkillSource();
  validateRemovedLocalLab();
  validateTestHarness();
}

if (errors.length) {
  console.error(`Guild-native check found ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const scope = contextOnly ? "Approved context artifacts" : "Guild-native Phase 1";
console.log(`${scope} check OK.`);
