# Live Context-Size Benchmark — 2026-07-28

## Isolation and method

The context-size benchmark ran only in a dedicated personal Guild workspace:

- workspace: `michaelpreuss/marketing-os-context-benchmark-20260728`
- workspace ID: `019faab5-8b00-3bb9-0000-724e9df0e6be`
- working-alpha workspace changed: no
- agents installed in the benchmark workspace: no
- package visibility changed: no
- external actions: none

The harness refuses to run against the baseline workspace, requires the target
workspace name to contain `benchmark`, publishes one context variant at a time,
and invokes all seven specialists from local `1.2.0` bundles. Every remote
session, complete output, error, and context revision is retained under the
ignored, permission-restricted `_private/context-benchmark` directory.

The three variants were:

| Variant | Approximate size | Purpose |
| --- | ---: | --- |
| Current | 4,970 tokens | Existing live compiled context from the private working alpha |
| Compressed | 1,789 tokens | Review-labeled company, product, audience, price, proof, compliance, and boundary facts |
| Pointer minimum | 499 tokens | Identity, policy boundaries, and artifact pointers without detailed facts |

The gate requires all seven routes to return contract-complete artifacts, zero
lost golden facts, no increase in unsupported claims versus current context,
and no regression in conflict recall.

## First complete run

Run directory:
`_private/context-benchmark/2026-07-28T21-54-52-294Z`

The initial report incorrectly showed zero complete routes because the
collector read `agent_notification_message.content.text`; local-bundle Guild
sessions carry the final artifact in `content.data`. The original manifest and
report remain untouched. The exact saved sessions were reprocessed without new
model calls into `manifest-corrected.json`, `report-corrected.json`, and
`artifacts-corrected`.

Corrected route completeness:

| Variant | Complete routes | Lost golden facts | V2 unqualified-sensitive-claim count |
| --- | ---: | --- | ---: |
| Current | 2/7 | `draft_only_boundary` | 1 |
| Compressed | 2/7 | None | 5 |
| Pointer minimum | 6/7 | `site_basic_price`, `team_price`, `optimize_price`, `funding_label`, `wave_proof`, `hipaa_nuance` | 3 |

The claim counts above use the checked-in V2 scorer, which excludes explicit
review-required labels, missing-evidence statements, approval/sign-off
requirements, and the preserved “may not be HIPAA compliant” nuance. The
original corrected report retains the earlier, broader scorer counts for audit
history.

No variant passed. The compressed variant preserved every golden fact but
failed five specialist routes. The pointer minimum produced the most complete
artifacts only by dropping pricing, funding, proof, and compliance facts that
the release gate requires.

## Strengthened compressed-context rerun

After the first run, the shared specialist prompt was strengthened to prohibit
model-background knowledge and to require a useful `needs_input` packet rather
than reusing review-required facts as draft claims. A new compressed-only run
was retained separately:

- run directory:
  `_private/context-benchmark/2026-07-28T22-09-11-097Z`
- complete routes: 5/7
- complete: Market Signal, ICP, Audience Segmentation, Branding And Pitch Deck,
  Campaigns And Paid Media
- blocked safely: Messaging, Social Monitoring And Content
- V2 unqualified-sensitive-claim count across returned artifacts: 4
- final release score: not calculated because this was an explicit partial
  remediation run

Messaging was rejected for an unqualified absolute `eliminate` claim. Social
Monitoring And Content was rejected for unqualified production-readiness and
ranking claims. Both returned a contract-valid blocked receipt and no unsafe
draft. The safety validator did not silently retry either substantive failure.

The five contract-complete artifacts still contained four unqualified
sensitive lines: one unapproved add-on price recommendation, one unsupported
“faster” line, one unapproved proof-placement recommendation, and one
unqualified security-framework coverage reference. Contract completeness
therefore does not imply content-quality acceptance.

## Decision

No workspace-context variant is selected. The public release gate remains
blocked.

The benchmark demonstrates two separate requirements for the next authorized
live cycle:

1. Deploy the authenticated state-backed `1.2.0` specialist and Builder
   sources so approval labels and consumed revisions are authoritative.
2. Re-run all three variants across all seven routes and require both 7/7
   contract completeness and zero unqualified sensitive claims before choosing
   the smallest eligible brief.

The working-alpha context and packages remain unchanged because deploying the
fixed sources without Guild-signed tenant identity and a delegated
workspace-scoped context publisher would weaken the required isolation model.
