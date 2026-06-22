import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { demoPackets, outputDir } from "./demo-packet-files.mjs";

await mkdir(outputDir, { recursive: true });

const packets = demoPackets();

for (const packet of packets) {
  await writeFile(resolve(outputDir, packet.filename), packet.content);
}

console.log(`Generated ${packets.length} local demo packets in ${outputDir}`);
