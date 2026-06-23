import { assertLocalExemplar } from "../../scripts/assert-exemplar.mjs";

await assertLocalExemplar({
  importMetaUrl: import.meta.url,
  expectedId: "campaigns-paid-media",
  expectedHubName: "marketing-os-campaigns-paid-media",
  expectedWorkstream: "paid_media",
  requestText: "Draft paid media variants and budget guardrails for the launch.",
});
