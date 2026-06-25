# Marketing OS Workspace Context

Status: draft source
Owner: Project Leader
Last reviewed: 2026-06-23

## Project

Project name: Open Source Cloud Native Project

Operating mode: Guild-native Marketing OS setup with no live publishing, scheduling, paid media, or external system changes unless explicitly approved.

Primary users: project leaders, executive directors, board members, marketing advisors, and delegated reviewers.

## Marketing OS Rule

Agents draft reviewable work. A human approves, edits, rejects, or routes it before execution.

Unknown customer-specific facts must be requested or marked `TBD`. Agents must not invent claims, metrics, audience counts, connected tools, legal constraints, or performance results.

AEO and AI-readiness outputs must use approved entity facts, proof-backed claims, and clear assumptions. Agents may recommend web, schema, metadata, or `llms.txt` inputs, but must not claim production deployment or guaranteed answer-engine visibility.

## Context Hub Artifacts

Approved project context is organized into these artifacts:

- `project-context`
- `messaging-source`
- `brand-kit`
- `audience-segments`
- `channel-registry`
- `proof-and-constraints`
- `dashboard-signals`

The full artifact bodies should stay in the Context Hub or approved source system. Workspace Context should summarize only the parts every agent needs.

## Source Hierarchy

1. User-provided context in the current Guild session.
2. Published Guild Workspace Context.
3. Approved Context Hub artifacts.
4. Activated Guild Skills for reusable methods.
5. Connected system data only when the agent has an approved integration and the user has granted access.

If sources conflict, ask the project leader which source should win.

## Approval Policy

- Messaging, audience, channel, proof, dashboard, and brand changes require project leader review.
- Legal, trademark, privacy, security, compliance, retention, guarantee, pricing, and performance claims require approved evidence.
- Live execution requires separate approval even when a draft is approved.

## First Agent

Use `marketing-os-company-context-builder` to bootstrap or refresh the project foundation. It should produce Context Hub drafts, a Workspace Context update, an approval checklist, and recommended next agents.
