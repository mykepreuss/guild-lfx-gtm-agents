# Guild Skills Source

This folder stores source markdown for private Guild Marketing OS Skills.

Skills are for reusable methods, playbooks, tone guidance, and review rubrics. They should not contain customer-specific facts or private source material.

Guild Skills are managed through the Guild CLI. These files are local source bodies for private live skills created with `guild skill create` and versioned with `guild skill version create`. The skills are only available at runtime to agents that declare the `guildai~skills` integration.

Use `catalog.json` as the source of truth for skill names, human-facing overviews, runtime activation descriptions, initial version numbers, current version numbers, body files, and the required runtime integration.

Runtime state:

- The seven prompt-only review agents under `agents/` declare `@guildai-services/guildai~skills@1.0.0`.
- Those agents expose Guild's generated `SkillsTools`, which provides `skills_search` and `skills_activate`.
- Their prompts require search before activation, activation only for relevant catalog skill `qualifiedName` records, and use of activated skill bodies as reusable method guidance only.
- `agents/foundation-setup/` does not declare `guildai~skills`; it stays a deterministic coded root agent until a separate programmatic activation design is approved.

Current source:

- `catalog.json` - source catalog for private Guild Skill names, versions, bodies, and activation descriptions.
- `guild-marketing-os-foundation-method.md` - reusable method for bootstrapping or refreshing the GTM foundation.
- `guild-marketing-os-customer-research-method.md` - reusable method for VOC, interview, review, support, survey, and community research synthesis.
- `guild-marketing-os-positioning-fit-proof-method.md` - reusable method for struggling moments, capability-benefit-proof mapping, fit boundaries, proof-backed positioning, and metric hypotheses.
- `guild-marketing-os-answer-engine-web-readiness-method.md` - reusable method for AEO, AI-readiness, schema, site architecture, metadata, and answer-ready web inputs.
- `guild-marketing-os-conversion-experimentation-method.md` - reusable method for CRO, tracking plans, KPI design, experiment planning, and performance loops.
- `guild-marketing-os-competitive-intelligence-method.md` - reusable method for competitor, peer, alternative, category, and comparison research.
- `guild-marketing-os-campaign-planning-method.md` - reusable method for campaign planning, paid-media review packets, creative testing, and activation gates.

These skill sources adapt the reviewed open-source marketing-skills patterns into Guild Marketing OS boundaries. Keep the Guild-native approval policy: skills can recommend, draft, and structure work, but they must not imply live publishing, spend, audience sync, CRM activation, credential setup, or tool execution.

Do not publish additional skill versions, publish agents, install workspace agents, publish workspace context, configure credentials, create triggers, or change public visibility until explicitly approved.
