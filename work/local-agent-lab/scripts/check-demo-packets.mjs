import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { demoPackets, outputDir } from "./demo-packet-files.mjs";

const mismatches = [];

for (const packet of demoPackets()) {
  const filePath = resolve(outputDir, packet.filename);

  try {
    const actual = await readFile(filePath, "utf8");
    if (actual !== packet.content) {
      mismatches.push(`${packet.filename} is stale`);
    }
  } catch (error) {
    if (error && error.code === "ENOENT") {
      mismatches.push(`${packet.filename} is missing`);
    } else {
      throw error;
    }
  }
}

if (mismatches.length) {
  console.error("Demo packets are not current. Run `npm run generate:demos`.");
  for (const mismatch of mismatches) {
    console.error(`- ${mismatch}`);
  }
  process.exit(1);
}

console.log(`Demo packets are current in ${outputDir}`);
