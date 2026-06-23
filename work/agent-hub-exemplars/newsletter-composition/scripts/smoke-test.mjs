import { assertLocalExemplar } from "../../scripts/assert-exemplar.mjs";

await assertLocalExemplar({
  importMetaUrl: import.meta.url,
  expectedId: "newsletter-composition",
  expectedHubName: "marketing-os-newsletter-composition",
  expectedWorkstream: "content",
  requestText: "Draft the weekly newsletter for maintainers and evaluators.",
});
