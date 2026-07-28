#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const catalog = JSON.parse(fs.readFileSync(path.join(process.cwd(), "agents/catalog.json"), "utf8"));
const packageDirs = [
  ...(catalog.supportPackages ?? []).map((entry) => entry.packageDir),
  ...(catalog.agents ?? []).map((entry) => entry.packageDir),
];

for (const packageDir of [...new Set(packageDirs)]) {
  const result = spawnSync("npm", ["run", "build"], {
    cwd: path.join(process.cwd(), packageDir),
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.status !== 0) {
    process.stderr.write(`Build failed: ${packageDir}\n${result.stdout ?? ""}${result.stderr ?? ""}`);
    process.exit(result.status ?? 1);
  }
}

console.log(`Guild agent build test OK (${packageDirs.length} packages).`);
