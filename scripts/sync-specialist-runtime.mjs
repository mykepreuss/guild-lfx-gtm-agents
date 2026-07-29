#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const sourcePath = path.join(root, "agents/_shared/specialist-runtime.ts");
const packageDirs = [
  "market-signal",
  "icp",
  "audience-segmentation",
  "messaging",
  "branding-pitch-deck",
  "social-monitoring-content",
  "campaigns-paid-media",
];
const source = fs.readFileSync(sourcePath, "utf8");
const write = process.argv.includes("--write");

const outOfSync = [];
for (const packageDir of packageDirs) {
  const targetPath = path.join(
    root,
    "agents",
    packageDir,
    "specialist-runtime.ts",
  );
  if (write) {
    fs.writeFileSync(targetPath, source);
    continue;
  }
  if (!fs.existsSync(targetPath) || fs.readFileSync(targetPath, "utf8") !== source) {
    outOfSync.push(path.relative(root, targetPath));
  }
}

if (write) {
  console.log(`Synchronized specialist runtime into ${packageDirs.length} packages.`);
} else if (outOfSync.length > 0) {
  console.error(
    `Specialist runtime copies are out of sync:\n${outOfSync
      .map((file) => `- ${file}`)
      .join("\n")}\nRun: node scripts/sync-specialist-runtime.mjs --write`,
  );
  process.exit(1);
} else {
  console.log(`Specialist runtime sync OK (${packageDirs.length} packages).`);
}
