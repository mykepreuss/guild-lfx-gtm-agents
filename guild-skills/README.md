# Guild Skills Source

This folder stores source markdown for private Guild Marketing OS Skills.

Skills are for reusable methods, playbooks, tone guidance, and review rubrics. They should not contain customer-specific facts or private source material.

Guild Skills are managed through the Guild CLI. These files are local source bodies for private live skills created with `guild skill create` and versioned with `guild skill version create`. The skills are only available at runtime to agents that declare the `guildai~skills` integration.

Use `catalog.json` as the source of truth for future skill names, human-facing overviews, runtime activation descriptions, initial version numbers, body files, and the required runtime integration. Do not add `guildai~skills` to agent packages until live skill versions exist and runtime activation is intentionally enabled.

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

Do not publish additional skill versions until explicitly approved.
