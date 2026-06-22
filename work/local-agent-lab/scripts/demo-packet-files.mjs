import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { agents, buildMenu, runAgent } from "../dist/index.js";

const LOCAL_ONLY_NOTICE =
  "<!-- Generated fixture demo packet. No live platform changes are performed. -->";

const currentDir = dirname(fileURLToPath(import.meta.url));

export const outputDir = resolve(currentDir, "../../../delivery/local-demo-packets");

function packetBody(content) {
  return [LOCAL_ONLY_NOTICE, "", content, ""].join("\n");
}

function agentPacketFilename(agent) {
  return `${String(agent.order).padStart(2, "0")}-${agent.id}.md`;
}

export function demoPackets() {
  return [
    {
      filename: "00-orchestrator-menu.md",
      content: packetBody(buildMenu()),
    },
    ...agents.map((agent) => ({
      filename: agentPacketFilename(agent),
      content: packetBody(runAgent(agent.id, agent.demoPrompt)),
    })),
  ];
}
