import { assertLocalExemplar } from "../../scripts/assert-exemplar.mjs";

await assertLocalExemplar({
  importMetaUrl: import.meta.url,
  expectedId: "social-content",
  expectedHubName: "marketing-os-social-content",
  expectedWorkstream: "content",
  requestText: "Create social posts for the launch week announcement.",
});
