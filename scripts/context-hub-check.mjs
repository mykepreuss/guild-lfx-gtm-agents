#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const rootDir = process.cwd();
const hubDir = path.join(rootDir, "context-hub");
const requiredFiles = [
  "README.md",
  "project-context.md",
  "messaging-source.md",
  "brand-kit.md",
  "audience-segments.md",
  "channel-registry.md",
  "proof-and-constraints.md",
  "dashboard-signals.md",
];
const blockedPatterns = [
  { pattern: /_private\//i, label: "private folder reference" },
  { pattern: /\/Users\//, label: "absolute local user path" },
  { pattern: /\bmp-hq\b/i, label: "private adjacent repo reference" },
  { pattern: /\bconfidential\b/i, label: "confidential marker" },
];

const errors = [];

if (!fs.existsSync(hubDir)) {
  errors.push("context-hub/ is missing.");
}

for (const file of requiredFiles) {
  const fullPath = path.join(hubDir, file);
  if (!fs.existsSync(fullPath)) {
    errors.push(`context-hub/${file} is missing.`);
    continue;
  }

  const content = fs.readFileSync(fullPath, "utf8");
  if (!content.startsWith("# ")) {
    errors.push(`context-hub/${file} must start with an H1 heading.`);
  }
  if (!/Status:/i.test(content)) {
    errors.push(`context-hub/${file} must include a Status line.`);
  }

  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const { pattern, label } of blockedPatterns) {
      if (pattern.test(line)) {
        errors.push(`context-hub/${file}:${index + 1} contains ${label}.`);
      }
    }
  });
}

if (errors.length) {
  console.error(`Context Hub check found ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Context Hub check OK (${requiredFiles.length} files checked).`);
