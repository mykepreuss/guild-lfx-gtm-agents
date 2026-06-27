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
const expectedEntrypointId = "intake";

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
const requiredIntakeSourceSnippets = [
  "agent({",
  "inputSchema",
  "outputSchema",
  "identifier:",
  "Deterministic chat-native entrypoint",
  "FirecrawlTools",
  "firecrawl_search_and_scrape",
  "Company Context Builder",
  "Public-source research",
  "recommended_agent",
  "public_source_research",
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

  if (!catalog.entrypoint || catalog.entrypoint.id !== expectedEntrypointId) {
    fail(`agents/catalog.json must include ${expectedEntrypointId} as the chat-native entrypoint.`);
  } else {
    validateCatalogPackageFields(catalog.entrypoint, { requireContextHub: false });
  }

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
    validateCatalogPackageFields(agent, { requireContextHub: true });

    if (ids.has(agent.id)) fail(`Duplicate agent id: ${agent.id}.`);
    ids.add(agent.id);

    if (guildNames.has(agent.guildName)) fail(`Duplicate guildName: ${agent.guildName}.`);
    guildNames.add(agent.guildName);

    validateContextHubReferences(agent);
  }

  if (!ids.has("foundation-setup")) fail("agents/catalog.json must include foundation-setup.");
}

function validateCatalogPackageFields(agent, { requireContextHub }) {
  if (!agent.id) fail("Every catalog package must include id.");
  if (!agent.guildName) fail(`${agent.id ?? "unknown package"} must include guildName.`);
  if (agent.guildName && !agent.guildName.startsWith("guild-marketing-os-")) {
    fail(`${agent.id ?? "unknown package"} guildName must start with guild-marketing-os-.`);
  }
  if (!agent.displayName) fail(`${agent.id ?? "unknown package"} must include displayName.`);
  if (!agent.description) fail(`${agent.id ?? "unknown package"} must include description.`);
  if (!agent.packageDir) fail(`${agent.id ?? "unknown package"} must include packageDir.`);
  if (requireContextHub && !agent.contextHub) fail(`${agent.id ?? "unknown package"} must include contextHub.`);
}

function validateContextHubReferences(agent) {
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
    const requiresZod = agent.id === "foundation-setup" || agent.id === expectedEntrypointId;
    if (requiresZod && packageJson?.dependencies?.zod !== "4.4.3") {
      fail(`${packageJsonPath} must pin zod to 4.4.3 for structured schema validation.`);
    }
    if (agent.id === expectedEntrypointId && packageJson?.dependencies?.["@guildai-services/dkountanis~firecrawl"] !== "6.1.0") {
      fail(`${packageJsonPath} must pin @guildai-services/dkountanis~firecrawl to 6.1.0 for public-source research.`);
    }
    if (!requiresZod && packageJson?.dependencies?.zod) {
      fail(`${packageJsonPath} should not depend on zod unless the package has a structured schema boundary.`);
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

    const requiredSnippets = agent.id === expectedEntrypointId
      ? requiredIntakeSourceSnippets
      : agent.id === "foundation-setup"
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
    if (agent.id === expectedEntrypointId && !source.includes('from "zod"')) {
      fail(`${packageDir}/agent.ts must import zod for structured validation.`);
    }
    if ((agent.id === "foundation-setup" || agent.id === expectedEntrypointId) && source.includes("llmAgent(")) {
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

  if (catalog.entrypoint) {
    validateAgentPackage(catalog.entrypoint);
  }

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
  const catalogFile = "guild-skills/catalog.json";
  if (!exists(catalogFile)) {
    fail(`${catalogFile} is missing.`);
    return;
  }

  const catalog = readJson(catalogFile);
  if (!catalog) return;

  if (catalog.status !== "live_private") {
    fail(`${catalogFile} status must be live_private.`);
  }
  if (catalog.visibility !== "internal_private") {
    fail(`${catalogFile} visibility must be internal_private.`);
  }
  if (catalog.requiredRuntimeIntegration !== "guildai~skills") {
    fail(`${catalogFile} must record guildai~skills as the required runtime integration.`);
  }
  if (!Array.isArray(catalog.skills) || catalog.skills.length === 0) {
    fail(`${catalogFile} must include skills.`);
    return;
  }
  const names = new Set();
  const skillNamePattern = /^[a-z][a-z0-9_.-]{0,99}$/;
  const semverPattern = /^\d+\.\d+\.\d+$/;

  for (const skill of catalog.skills) {
    const label = skill?.name ?? "unknown skill";
    if (!skillNamePattern.test(skill?.name ?? "")) {
      fail(`${catalogFile} skill ${label} must use a Guild-valid skill name.`);
    }
    if (names.has(skill.name)) {
      fail(`${catalogFile} has duplicate skill name ${skill.name}.`);
    }
    names.add(skill.name);
    const expectedQualifiedName = `${catalog.owner}~${skill.name}`;
    if (skill.qualifiedName !== expectedQualifiedName) {
      fail(`${catalogFile} skill ${label} qualifiedName must be ${expectedQualifiedName}.`);
    }
    if (!skill.bodyFile || path.basename(skill.bodyFile) !== skill.bodyFile || !skill.bodyFile.endsWith(".md")) {
      fail(`${catalogFile} skill ${label} must include a local markdown bodyFile.`);
      continue;
    }
    if (!semverPattern.test(skill.initialVersion ?? "")) {
      fail(`${catalogFile} skill ${label} must include a semver initialVersion.`);
    }
    if (!semverPattern.test(skill.currentVersion ?? "")) {
      fail(`${catalogFile} skill ${label} must include a semver currentVersion.`);
    }
    if (!skill.overview || skill.overview.length > 160) {
      fail(`${catalogFile} skill ${label} must include a concise human-facing overview.`);
    }
    if (!skill.runtimeDescription || !/^Use when\b/i.test(skill.runtimeDescription)) {
      fail(`${catalogFile} skill ${label} runtimeDescription must start with Use when.`);
    }
    const file = path.join("guild-skills", skill.bodyFile);
    if (!exists(file)) {
      fail(`${file} is missing.`);
      continue;
    }
    const content = readText(file);
    if (!content.startsWith("# ")) {
      fail(`${file} must start with an H1 heading.`);
    }
    if (!/Status:\s*live private/i.test(content)) {
      fail(`${file} must include a live private Status line.`);
    }
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

  const publishFile = "scripts/publish-guild-agent.mjs";
  if (!exists(publishFile)) {
    fail(`${publishFile} is missing.`);
    return;
  }

  const publishContent = readText(publishFile);
  for (const snippet of [
    "guild agent clone",
    "guild agent save",
    "--no-bump",
    "--publish",
    "GitHub source repo",
    "temporary Guild clone",
    "latest_published_version",
    "x-access-token:<redacted>",
  ]) {
    if (!publishContent.includes(snippet)) {
      fail(`${publishFile} must include ${snippet}.`);
    }
  }

  const packageJson = readJson("package.json");
  if (packageJson?.scripts?.["publish:guild-agent"] !== "node scripts/publish-guild-agent.mjs") {
    fail("package.json must include publish:guild-agent script.");
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
