import { assertLocalExemplar } from "../../scripts/assert-exemplar.mjs";

await assertLocalExemplar({
  importMetaUrl: import.meta.url,
  expectedId: "event-creation",
  expectedHubName: "marketing-os-event-creation",
  expectedWorkstream: "events",
  requestText: "Create the event plan for a technical launch webinar.",
});
