import { assertLocalExemplar } from "../../scripts/assert-exemplar.mjs";

await assertLocalExemplar({
  importMetaUrl: import.meta.url,
  expectedId: "campaign-performance",
  expectedHubName: "marketing-os-campaign-performance",
  expectedWorkstream: "performance",
  requestText: "Run the Monday performance readout and recommend pause or scale actions.",
});
