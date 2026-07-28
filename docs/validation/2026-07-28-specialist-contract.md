# Specialist Contract And Claim-Safety Validation — 2026-07-28

## Trigger

A follow-up one-shot Messaging request was run in the signed-in private Guild
workspace after the browser routing walkthrough. The request was draft-only and
asked for the standard seven-section Marketing OS frame.

- Session: `019faaa8-aaf4-351a-0000-d1474c524193`
- Live package: Messaging `1.1.1`
- External actions: none
- Complete evidence: retained under ignored `_private/evidence`

The transport and frame were complete, but the artifact failed substantive
claim safety. It used absolute or strengthened language including
`production-ready`, `instantly`, `eliminates`, `high-converting`,
`high-performance`, `scales securely`, `trusted by`, and `without
compromises`. It also changed the required source nuance from “may not be HIPAA
compliant” to a categorical claim.

This failed attempt is not replaced by the earlier structural route passes. It
is a separate content-quality release failure.

## Source fix

All seven specialist packages now use the same coded runtime contract:

- strict seven-heading validation;
- one evidence mode in the narrative and the same mode in the status payload;
- typed status payload arrays and the complete draft-only safety envelope;
- `observed_at` and inspected-source coverage for connected or live evidence;
- one repair attempt for format-only failures;
- no silent repair for evidence or safety failures;
- deterministic rejection of external-action wording, absolute claim wording,
  strengthened HIPAA wording, the Builder-only publication phrase, and runtime
  metadata;
- a contract-valid blocked receipt when the artifact is rejected.

The runtime is copied into each self-contained package from
`agents/_shared/specialist-runtime.ts`; the sync check prevents package drift.
The seven source versions are now `1.2.0`.

Launcher performs the same strict checks at the child-result boundary, so a
stale, malformed, or compromised specialist does not bypass the specialist
runtime.

## Context-publication fix

The same probe showed that the existing live workspace context included raw
review-required pricing, proof, scale, financial, security, and compliance
claims inside a published brief. Downstream agents could therefore mistake
presence in workspace context for public-claim approval.

Company Context Builder `1.2.0` now:

- verifies that the retained encrypted source revision still exists;
- compacts only the durably approved reusable artifact corpus, not the raw
  source;
- keeps review-required claims as category-level withheld summaries;
- rejects unqualified sensitive claims deterministically before an LLM audit
  can bless them;
- keeps the encrypted raw source available only through its durable source
  reference.

Regression coverage proves that raw Webflow scale, funding, uptime, trust, and
customer-outcome claims do not enter the always-on managed context block.

## Automated evidence

Passing checks:

- `npm run check:specialist-runtime-sync`
- `npm run test:specialist-runtime`
- `npm run test:launcher-routing`
- `npm run test:launcher-cockpit`
- `npm run test:foundation-state`
- `npm run test:agent-builds`
- `npm run check:guild-native`

## Release state

This is source-ready private-alpha work only. The fixed specialist `1.2.0`,
Builder `1.2.0`, and Launcher `0.3.0` versions were not published or installed
because the authenticated production state service and delegated Guild tenant
identity are still unavailable. The live workspace therefore remains on
Launcher `0.2.5`, Builder `1.1.2`, and specialist `1.1.1` packages.

Browser acceptance of the fixed versions remains blocked until those versions
can be wired to the managed state service without weakening tenant isolation.
