#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  countUnqualifiedSensitiveClaims,
  unqualifiedSensitiveClaimLines,
} from "./lib/context-benchmark-scoring.mjs";

const artifact = `## Produced Artifact

- Retool reported 70% more demo bookings. [source_supplied_review_required]
- Pricing is $299/month, pending verification.
- Webflow may not be HIPAA compliant.
- No live performance data is available.
- Claims about uptime are missing evidence.
- Security framework claims require validation.
- Pricing sign-off is required for $2,500/month.
- Approved reusable proof: Wave reported a 3x improvement.
- Product Marketing Verification: Confirm the Team Plan at $2,500/month.
- The website is positioned as a revenue engine.
- This draft claims 70% more demo bookings.
- This draft launches 4x faster.
- This is secure and compliant.

## Assumptions And Missing Evidence

Evidence mode: source_supplied
`;

assert.deepEqual(unqualifiedSensitiveClaimLines(artifact), [
  "- This draft claims 70% more demo bookings.",
  "- This draft launches 4x faster.",
  "- This is secure and compliant.",
]);
assert.equal(countUnqualifiedSensitiveClaims(artifact), 3);
assert.equal(
  countUnqualifiedSensitiveClaims(
    "## Produced Artifact\n\nGeneral draft copy.\n\n## Assumptions And Missing Evidence",
  ),
  0,
);

console.log("Context benchmark scoring tests passed.");
