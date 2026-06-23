import { assertLocalExemplar } from "../../scripts/assert-exemplar.mjs";

await assertLocalExemplar({
  importMetaUrl: import.meta.url,
  expectedId: "event-promotion",
  expectedHubName: "marketing-os-event-promotion",
  expectedWorkstream: "events",
  requestText: "Promote the launch webinar and forecast registrations.",
});
