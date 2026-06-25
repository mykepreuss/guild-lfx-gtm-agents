#!/usr/bin/env node
if (!process.argv.includes("--context")) {
  process.argv.push("--context");
}

await import("./check-guild-native.mjs");
