# Marketing Agent Starter Pack Plan

Public-safe planning note for the reusable Guild-native Marketing OS agent suite. Keep confidential source material in `_private/`.

## Product Framing

The strongest product shape is a reusable Marketing Agent Starter Pack for Guild Agent Hub.

The starter pack should fit Guild's public platform model: reusable agents that can be built, validated, governed, shared, forked, and supplied with customer-owned context inside a specific workspace.

The starter pack should not directly encode one customer's internal process. It should package reusable agent behavior, context contracts, approval gates, and handoff artifacts that can be adapted without rebuilding the operating model.

Use this boundary:

- Agent packages contain reusable workflow behavior.
- Workspace Context contains concise always-on project routing context.
- Context Hub artifacts contain approved user-owned marketing context.
- Skills contain reusable methods, review rubrics, and playbooks.
- Agent outputs include both a reviewable artifact and a status or dashboard update payload.
- Customer-specific facts and source material stay outside public packages.

## Design Principles

- Build reusable agents first; apply customer-specific context second.
- Treat business-process specs as source material, not as final agent architecture.
- Prefer agentic loops that gather context, reason, draft, check, route approval, and update status.
- Avoid embedding private customer assumptions in public Agent Hub behavior.
- Make upstream context agents compound into downstream execution agents.
- Treat AEO as a first-class readiness output: entity facts, proof-backed claims, answer-ready language, and web recommendations should come from approved context.
- Separate brand architecture from final design production.
- Keep live publishing, spend, CRM activation, legal approval, and production dashboarding behind explicit future approval.

## Recommended Phase Order

| Phase | Agent | Primary Job | Why It Comes Here |
| --- | --- | --- | --- |
| 1 | Knowledge Graph / Company Context Builder | Normalize raw business context into approved Context Hub artifacts, entity facts, proof points, and routing guidance. | Every other agent needs a shared factual base, entity clarity, and approval boundary. |
| 2 | Market Signal Agent | Listen to external market, community, search, answer-engine, developer, and social signals. | Grounds audience, messaging, AEO, and content work in what the market is actually saying. |
| 3 | ICP Agent | Define target audiences, personas, pains, objections, motivations, triggers, and fit criteria. | Turns context and signal into a clear target model. |
| 4 | Audience Segmentation Agent | Translate ICP into usable segment definitions, rules, suppressions, and channel-specific targeting logic. | Bridges strategy to campaign and content execution. |
| 5 | Messaging Agent | Produce positioning, narrative, pillars, proof-backed claims, answer-ready blocks, tone, boilerplate, and objection handling. | Creates the reusable language foundation downstream agents and answer engines need. |
| 6 | Branding And Pitch Deck Agent | Convert messaging into brand architecture, web and AEO recommendations, pitch narrative, and design production briefs. | Consumes approved messaging instead of inventing brand strategy from scratch. |
| 7 | Social Monitoring And Content Agent | Combine social/community monitoring with approved-message content planning, owned-content ideas, digest inputs, and post drafts. | Closes the loop between market listening and content production. |
| 8 | Campaigns And Paid Media Agent | Build campaign and paid-media plans, creative matrices, landing-page recommendations, test plans, and performance loops. | Highest leverage after context, segments, and messaging are approved. |

## Near-Term Shortlist

All eight agents are committed V1 deliverables. If implementation needs a staged build sequence, prioritize:

1. Knowledge Graph / Company Context Builder
2. Market Signal Agent
3. ICP Agent
4. Messaging Agent

This order creates the reusable context layer that later segmentation, brand, AEO, content, campaign, and paid-media agents can consume.

## Reusability Matrix

Use this evaluation matrix when deciding what to build or pitch next:

| Agent | Broad Applicability | Recurring Value | Customer Specificity | AEO / Readiness Contribution | V1 Confidence |
| --- | --- | --- | --- | --- | --- |
| Knowledge Graph / Company Context Builder | High | High | Medium | Entity facts, proof points, constraints, and source-of-truth context. | High |
| Market Signal | High | High | Low to medium | Search, answer-engine, peer, and audience language signals. | High with public/source-configurable inputs |
| ICP | High | Medium | Medium | Audience-specific questions, pains, objections, and answer priorities. | High |
| Audience Segmentation | High | High | Medium to high | Segment-specific targeting, suppression, channel, and consent logic. | Medium |
| Messaging | High | Medium | Medium | Answer-ready blocks, claim constraints, boilerplate, and proof-backed language. | High |
| Branding And Pitch Deck | Medium to high | Medium | Medium to high | Web presence recommendations, entity clarity, and project overview story. | Medium |
| Social Monitoring And Content | High | High | Medium | Content opportunities, proof checks, digest inputs, and recurring question coverage. | Medium |
| Campaigns And Paid Media | High | High | Medium to high | Landing-page recommendations, message tests, tracking needs, and performance narratives. | Medium |

## V1 Delivery Shape

A credible V1 should prove the reusable operating loop:

`User supplies context -> Agent drafts artifact -> User reviews/approves -> Agent prepares execution handoff -> Status/context updates`

Minimum useful outputs:

- captured inputs and assumptions
- generated artifact or recommendation
- AEO and AI-readiness outputs where relevant
- confidence and risk notes
- approval checklist
- dashboard or status update payload
- downstream context updates
- future integration notes

The first implementation should emphasize strong artifact quality and clear approval boundaries over production automation across every channel.

All eight agents in the confirmed V1 order are committed deliverables. V1 should produce working local source packages and demoable outputs for the suite, while leaving live publishing, spend changes, CRM activation, legal approval, production dashboards, and production integrations behind explicit future approval.

## Settled V1 Decisions

- Deliver all eight agents as V1 source packages.
- Keep event setup, event execution, sponsor operations, podcast setup, and YouTube channel setup out of V1 as standalone agents.
- Fold campaign performance into Campaigns And Paid Media as reporting, anomaly, testing, pause/scale, and optimization recommendations.
- Treat AEO and AI-readiness as cross-cutting outputs, with primary ownership in Company Context, Market Signal, Messaging, and Branding And Pitch Deck.
- Use approval-ready artifacts and future adapter notes before live operational changes.
- Keep public examples generic unless specific customer examples are approved for public use.
