import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const expectedPackages = [
  "foundation-setup",
  "newsletter-composition",
  "social-content",
  "event-creation",
  "event-promotion",
  "audience-segmentation",
  "owned-media-production",
  "campaign-performance",
  "campaigns-paid-media",
];

const currentDir = dirname(fileURLToPath(import.meta.url));
const exemplarsDir = resolve(currentDir, "..");

for (const packageName of expectedPackages) {
  const packageDir = resolve(exemplarsDir, packageName);
  const requiredFiles = [
    "README.md",
    "package.json",
    "tsconfig.json",
    "src/agent.ts",
    "scripts/smoke-test.mjs",
  ];

  for (const file of requiredFiles) {
    assert.equal(existsSync(resolve(packageDir, file)), true, `${packageName} missing ${file}`);
  }

  assert.equal(
    existsSync(resolve(packageDir, "guild.json")),
    false,
    `${packageName} must not include guild.json before packaging approval`,
  );

  const result = spawnSync("npm", ["run", "verify", "--prefix", packageDir], {
    stdio: "inherit",
  });

  assert.equal(result.status, 0, `${packageName} exemplar verification failed`);
}

console.log(`Verified ${expectedPackages.length} local-only Agent Hub exemplars.`);

