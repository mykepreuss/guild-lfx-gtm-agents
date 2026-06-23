import { assertLocalExemplar } from "../../scripts/assert-exemplar.mjs";

await assertLocalExemplar({
  importMetaUrl: import.meta.url,
  expectedId: "audience-segmentation",
  expectedHubName: "marketing-os-audience-segmentation",
  expectedWorkstream: "audience",
  requestText: "Segment the launch audience for evaluators and maintainers.",
});
