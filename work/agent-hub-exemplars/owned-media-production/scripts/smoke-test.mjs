import { assertLocalExemplar } from "../../scripts/assert-exemplar.mjs";

await assertLocalExemplar({
  importMetaUrl: import.meta.url,
  expectedId: "owned-media-production",
  expectedHubName: "marketing-os-owned-media-production",
  expectedWorkstream: "owned_media",
  requestText: "Produce owned media clips and newsletter teasers for the launch.",
});
