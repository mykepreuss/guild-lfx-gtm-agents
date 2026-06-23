import { assertLocalExemplar } from "../../scripts/assert-exemplar.mjs";

await assertLocalExemplar({
  importMetaUrl: import.meta.url,
  expectedId: "foundation-setup",
  expectedHubName: "marketing-os-foundation-setup",
  expectedWorkstream: "foundation",
  requestText: "Set up the foundation for the open-source cloud native launch.",
});
