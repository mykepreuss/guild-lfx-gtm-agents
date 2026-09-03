#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const rootDir = process.cwd();
const fixturePath = path.join(
  rootDir,
  "scripts/fixtures/webflow-company-profile.md",
);
const fixture = fs.readFileSync(fixturePath, "utf8");
const foundationDir = path.join(rootDir, "agents/foundation-setup");

const build = spawnSync("npm", ["run", "build"], {
  cwd: foundationDir,
  encoding: "utf8",
  maxBuffer: 20 * 1024 * 1024,
});
if (build.status !== 0) {
  process.stderr.write(`${build.stdout ?? ""}${build.stderr ?? ""}`);
  process.exit(build.status ?? 1);
}

const {
  default: foundationAgent,
  cleanApprovedSourceForWorkspaceContext,
  stripCitationMarkers,
  removeFencedBlocks,
  convertMarkdownTablesToBullets,
  isSensitiveClaim,
  normalizeBlockedClaims,
  preservesQualifiedHipaaNuance,
  replaceManagedWorkspaceContextBlock,
  sourceEvidenceLabelsAllowReuse,
} = await import(path.join(foundationDir, "dist/agent.js"));
const { resolveBuilderSemanticAction } = await import(
  path.join(foundationDir, "dist/conversation-intent.js"),
);

function createTask({
  sessionId,
  workspaceReadMode = "published",
  llmText = "not json",
  llmTexts,
}) {
  let state;
  let llmCalls = 0;
  let saveCalls = 0;
  let toolCalls = 0;
  const task = {
    sessionId,
    console,
    llm: {
      async generateText(input) {
        const response = llmTexts?.[llmCalls] ?? llmText;
        llmCalls += 1;
        if (response instanceof Error) throw response;
        return { text: typeof response === "function" ? await response(input.prompt) : response };
      },
    },
    async save(nextState) {
      saveCalls += 1;
      state = structuredClone(nextState);
    },
    async restore() {
      return state;
    },
    tools: {
      async guild_get_session() {
        toolCalls += 1;
        return {
          id: sessionId,
          workspace: {
            id: "workspace_test",
            name: "marketing-os",
            full_name: "example/marketing-os",
            owner: {
              id: "owner_test",
              type: "organization",
              name: "example",
            },
          },
          session_type: "chat",
          context_id:
            workspaceReadMode === "published"
              ? "context_published"
              : null,
          created_at: "2026-07-28T00:00:00.000Z",
          updated_at: "2026-07-28T00:00:00.000Z",
        };
      },
      async guild_get_workspace() {
        toolCalls += 1;
        const managedContext =
          workspaceReadMode === "published"
            ? [
                "<!-- guild-marketing-os-context:start -->",
                "# Guild Marketing OS Managed Company Context",
                "Status: published",
                "Company: Webflow",
                "## Workspace Context Brief",
                "Approved compact context.",
                "<!-- guild-marketing-os-context:end -->",
              ].join("\n")
            : "No approved Marketing OS company context.";
        return {
          id: "workspace_test",
          name: "marketing-os",
          full_name: "example/marketing-os",
          owner: {
            id: "owner_test",
            type: "organization",
            name: "example",
          },
          context: {
            id:
              workspaceReadMode === "published"
                ? "context_published"
                : null,
            compiled: managedContext,
            generated: "",
            manual: managedContext,
          },
        };
      },
    },
  };
  return {
    task,
    readState() {
      return structuredClone(state);
    },
    llmCallCount() {
      return llmCalls;
    },
    saveCallCount() { return saveCalls; },
    toolCallCount() { return toolCalls; },
  };
}

function guildChatEnvelope(text) {
  return JSON.stringify({
    type: "text",
    text: [
      "* This session was started at 18:50:27 (24h, UTC) on Sunday, June 28, 2026.",
      "* The current Guild workspace is named `guild-marketing-os`.",
      "",
      text,
    ].join("\n"),
  });
}

{
  const harness = createTask({
    sessionId: "foundation-url-reference-with-launcher-contract",
    workspaceReadMode: "missing",
  });
  const result = await foundationAgent.start(
    {
      type: "text",
      text: [
        "Set up Marketing OS for Guild. Our website is https://guild.ai/",
        "",
        "Launcher contract:",
        "- Consume published workspace context revision unavailable as the first source of truth.",
        "- Return the complete standard Guild Marketing OS output frame.",
        "- Keep action_mode draft_only and external_mutation_requested false.",
      ].join("\n"),
    },
    harness.task,
  );
  assert.equal(result.type, "output");
  assert.equal(harness.llmCallCount(), 0);
  assert.match(result.output.text, /Conversation intent: missing_context/);
  assert.match(result.output.text, /"status": "needs_input"/);
  assert.match(result.output.text, /Company: Guild/);
  assert.match(result.output.text, /supplied URL was recorded as a reference/i);
  assert.match(result.output.text, /built-in LLM has no web access/i);
  assert.match(result.output.text, /I cannot open that URL in this version/i);
  assert.doesNotMatch(result.output.text, /publish approved context to workspace context/i);
  assert.doesNotMatch(result.output.text, /Channels TBD: Website/i);
  assert.doesNotMatch(result.output.text, /Requires approved company description and proof-backed claims/i);
  const openQuestions = result.output.text
    .split("### Open Questions")[1]
    .split("## Approval Gate")[0]
    .split("\n")
    .filter((line) => /^- .*\?$/.test(line.trim()));
  assert.equal(openQuestions.length, 3);
}

{
  const harness = createTask({
    sessionId: "foundation-governance-audience-baseline",
    workspaceReadMode: "missing",
  });
  const result = await foundationAgent.start(
    {
      type: "text",
      text: [
        "Company name: Guild",
        "Approved description: Guild provides a platform for creating and discovering AI agents.",
        "Primary audiences: AI leaders, AI platform leaders, developer relations teams, and governance/security stakeholders.",
        "Current marketing goal: improve agent discovery and keep AI-spend governance clear.",
        "Channels in scope: website, email, organic social, and presentations.",
      ].join("\n"),
    },
    harness.task,
  );
  assert.equal(result.type, "output");
  assert.equal(harness.readState().lastOutput.status, "ready_for_review");
  assert.equal(
    harness.readState().lastOutput.claimsNeedingApproval.some(
      (claim) => claim.source === "sensitive_claim_guardrail",
    ),
    false,
    "audience roles and marketing goals must not be mistaken for factual security or spend claims",
  );
  assert.match(result.output.text, /Company: Guild/);
  assert.doesNotMatch(result.output.text, /Evidence-led, precise, and review-oriented/);
}

{
  const harness = createTask({
    sessionId: "foundation-single-paragraph-cmo-baseline",
    workspaceReadMode: "missing",
  });
  const result = await foundationAgent.start(
    {
      type: "text",
      text: "Approved company description: Guild provides a platform for creating and discovering AI agents. Primary audiences: AI leaders, AI platform leaders, developer relations teams, and governance/security stakeholders; treat these as hypotheses for review. Current marketing goal: improve agent discovery and grow agent-driven traffic while keeping AI-spend governance clear. Approved draft channels: website, LinkedIn, and sales enablement.",
    },
    harness.task,
  );
  assert.equal(result.type, "output");
  assert.equal(harness.readState().lastOutput.status, "ready_for_review");
  assert.equal(
    harness.readState().lastOutput.claimsNeedingApproval.some(
      (claim) => claim.source === "sensitive_claim_guardrail",
    ),
    false,
    "a natural one-paragraph baseline must not route audience and goal text through the sensitive-claim fallback",
  );
  assert.deepEqual(
    harness.readState().lastOutput.contextArtifacts.companyContext.primaryAudiences,
    [
      "AI leaders",
      "AI platform leaders",
      "developer relations teams",
      "governance/security stakeholders",
    ],
  );
  assert.match(result.output.text, /Company: Guild/);
  assert.match(result.output.text, /website/);
}

{
  const harness = createTask({ sessionId: "foundation-managed-refresh" });
  const result = await foundationAgent.start(
    {
      type: "text",
      text: [
        "<!-- guild-marketing-os-context:start -->",
        "# Guild Marketing OS Managed Company Context",
        "Status: published",
        "Company: Webflow",
        "Approved description: Webflow is a website experience platform.",
        "Primary audiences: Marketers, designers, and developers.",
        "Current goals: Increase marketing velocity.",
        "Anything not approved for reuse: Unsupported performance or legal claims.",
        "## Workspace Context Brief",
        "Use this as approved company context.",
        "<!-- guild-marketing-os-context:end -->",
        "",
        "Refresh company context readiness. Do not approve or publish.",
      ].join("\n"),
    },
    harness.task,
  );
  assert.equal(result.type, "output");
  assert.match(result.output.text, /Company Context Approval Packet/);
  assert.match(result.output.text, /Company: Webflow/);
  assert.match(result.output.text, /approved_in_session: false/);
  assert.doesNotMatch(result.output.text, /attachment_unreadable/);
  assert.equal(harness.readState().lastOutput.conversationIntent, "source_available");
  assert.match(
    harness.readState().lastSourceText,
    /Guild Marketing OS Managed Company Context/,
  );
}

{
  const harness = createTask({ sessionId: "foundation-explicit-source-overrides-managed-context" });
  const result = await foundationAgent.start(
    {
      type: "text",
      text: [
        "<!-- guild-marketing-os-context:start -->",
        "# Guild Marketing OS Managed Company Context",
        "Status: published",
        "Company: Webflow",
        "Approved description: Webflow is a website experience platform.",
        "<!-- guild-marketing-os-context:end -->",
        "",
        "Company name: Acme Cloud",
        "Approved description: Acme Cloud helps platform teams review operational readiness.",
        "Primary audiences: platform leaders and developer relations leads.",
        "Current goals: create company context and prepare messaging.",
        "Proof-backed claims: Acme Cloud is SOC 2 compliant; Acme Cloud improves performance by 300%; Acme Cloud has public pricing approval.",
        "Channels in scope: website and email.",
      ].join("\n"),
    },
    harness.task,
  );
  assert.equal(result.type, "output");
  assert.match(result.output.text, /Company: Acme Cloud/);
  assert.doesNotMatch(result.output.text, /Company: Webflow/);
  assert.match(result.output.text, /SOC 2 compliant/);
  assert.match(result.output.text, /performance by 300%/);
  assert.match(result.output.text, /public pricing approval/);
  assert.match(result.output.text, /sensitive_claim_guardrail/);
}

{
  const harness = createTask({ sessionId: "foundation-draft-approval" });
  const approvalFixture = [
    "Company name: Webflow.",
    "Approved description: Webflow is a visual website platform for teams that need to design, build, manage, and optimize web experiences.",
    "Primary audiences: marketing teams, web teams, agencies, designers, developers, and enterprise digital teams.",
    "Current goals: create approved company context and route the next Marketing OS agent.",
    "Proof-backed claims: the user-supplied source packet says Webflow combines visual site design, CMS, hosting, collaboration, optimization, AI, and extensibility features.",
    "Approved channels: website, email, social content, pitch materials, and campaign planning.",
  ].join("\n");
  const draft = await foundationAgent.start(
    { type: "text", text: approvalFixture },
    harness.task,
  );
  assert.equal(draft.type, "output");
  assert.match(draft.output.text, /Company Context Approval Packet/);
  assert.match(draft.output.text, /Company: Webflow/);
  assert.match(draft.output.text, /saved_to_workspace_context: false/);
  assert.match(draft.output.text, /saved_to_context_artifacts: true/);
  assert.match(draft.output.text, /retained in this Guild Chat/);
  assert.match(
    draft.output.text,
    /Review required — Company Context Owner:/,
    "a complete baseline should require company-context owner review",
  );
  assert.match(
    draft.output.text,
    /Entity clarity: The approved company description can serve as the baseline entity summary\./,
    "a user-supplied approved description should provide draft entity clarity",
  );
  assert.match(
    draft.output.text,
    /Recommended web inputs for review:/,
    "recommended research inputs should be visibly review-qualified",
  );
  const evidenceSection = draft.output.text
    .split("## Assumptions And Missing Evidence")[1]
    .split("## Approval Gate")[0];
  assert.equal(
    evidenceSection.match(
      /\b(?:source_supplied|connected_read_only|live_monitoring)\b/g,
    )?.length,
    1,
    "Builder should state exactly one evidence mode in the shared evidence section",
  );
  const statusJson = draft.output.text
    .split("## Status Payload")[1]
    .split("## Downstream Handoff")[0]
    .match(/```json\s*([\s\S]*?)```/i)?.[1];
  assert.ok(statusJson, "Builder should render one shared status JSON block");
  assert.equal(
    JSON.parse(statusJson).status,
    harness.readState().lastOutput.status,
    "Builder should expose its shared artifact status in Status Payload",
  );
  assert.ok(
    draft.output.text.lastIndexOf("## Downstream Handoff") >
      draft.output.text.lastIndexOf("\n## "),
    "Downstream Handoff should be the final top-level artifact section",
  );
  assert.equal(harness.readState().lastSourceText, approvalFixture);
  assert.equal(
    harness.readState().durableContextArtifactStatus,
    "ready_for_review",
  );
  assert.match(draft.output.text, /plus review-ready Company Context artifact/);

  const readyState = harness.readState();
  readyState.lastOutput.status = "ready_for_review";
  readyState.lastOutput.statusPayload.readiness = "review_ready";
  readyState.lastOutput.statusPayload.blockers = [];
  readyState.durableContextArtifactStatus = "ready_for_review";
  await harness.task.save(readyState);

  const approvalText = "Context approved save to workspace context";
  const approval = await foundationAgent.start(
    { type: "text", text: approvalText },
    harness.task,
  );
  assert.equal(approval.type, "output");
  assert.match(approval.output.text, /approved_in_session: true/);
  assert.match(approval.output.text, /approved in this Guild Chat/);
  assert.match(approval.output.text, new RegExp(approvalText));
  assert.equal(harness.readState().approvedSourceText, approvalFixture);
  assert.equal(
    harness.readState().durableContextArtifactStatus,
    "approved",
  );

  const directPublish = await foundationAgent.start(
    {
      type: "text",
      text: "publish approved context to workspace context",
    },
    harness.task,
  );
  assert.equal(directPublish.type, "output");
  assert.match(
    directPublish.output.text,
    /publication belongs to the canonical Marketing OS Launcher Chat/,
  );
  assert.match(
    directPublish.output.text,
    /saved_to_workspace_context: false/,
  );
  assert.match(
    directPublish.output.text,
    /workspace_context_status: approved_pending_publish/,
  );
  assert.equal(
    harness.readState().workspaceContextStatus,
    "approved_pending_publish",
  );
}

{
  const harness = createTask({ sessionId: "foundation-envelope" });
  const first = await foundationAgent.start(
    { type: "text", text: guildChatEnvelope(fixture) },
    harness.task,
  );
  assert.equal(first.type, "output");
  assert.match(first.output.text, /Company: Webflow/);
  assert.equal(
    harness.readState().lastOutput.statusPayload.companyName,
    "Webflow",
  );
  assert.ok(harness.readState().lastSourceText.includes("# Webflow"));
}

{
  const harness = createTask({
    sessionId: "foundation-marketer-baseline",
    workspaceReadMode: "missing",
  });
  const source = [
    "Set up Marketing OS for Webflow.",
    "",
    "Company description:",
    "Webflow is a visual website platform that helps marketing, design, and development teams build and manage websites together.",
    "",
    "Primary audiences:",
    "Enterprise marketing leaders, web teams, designers, developers, and digital agencies.",
    "",
    "Current marketing goal:",
    "Help enterprise teams launch and improve web experiences faster while keeping brand and engineering governance.",
    "",
    "Approved claims:",
    "Webflow combines visual site design, CMS, hosting, collaboration, analytics, optimization, AI, and extensibility.",
    "The platform serves marketing teams, designers, developers, agencies, freelancers, and startups.",
    "",
    "Channels in scope:",
    "Website, blog, customer stories, email, organic social, presentations, and campaign planning.",
    "",
    "Important constraints:",
    "Do not invent customer results, pricing, security, compliance, or performance claims. Keep unknown facts as TBD.",
    "",
    "Keep everything draft-only.",
  ].join("\n");
  const result = await foundationAgent.start(
    { type: "text", text: source },
    harness.task,
  );
  assert.equal(result.type, "output");
  assert.equal(harness.readState().lastOutput.status, "ready_for_review");
  assert.equal(
    harness.readState().lastOutput.statusPayload.readiness,
    "review_ready",
  );
  assert.equal(
    harness.readState().durableContextArtifactStatus,
    "ready_for_review",
  );
  assert.deepEqual(
    harness.readState().lastOutput.contextArtifacts.companyContext.goals,
    [
      "Help enterprise teams launch and improve web experiences faster while keeping brand and engineering governance",
    ],
    "a marketing goal should remain an intention rather than becoming a blocked performance claim",
  );
  assert.equal(
    harness.readState().lastOutput.contextArtifacts.proofAndConstraints
      .approvedClaims.some((claim) =>
        /combines visual site design, CMS, hosting/i.test(claim.claim)
      ),
    true,
    "explicitly labeled approved claims should be retained for artifact review",
  );
  assert.equal(
    harness.readState().lastOutput.claimsNeedingApproval.length,
    0,
    "unknown-proof constraints should remain constraints rather than blocked claims",
  );
  assert.match(result.output.text, /"status": "ready_for_review"/);
  assert.match(
    result.output.text,
    /Current marketing goal: Help enterprise teams launch and improve web experiences faster/,
  );
  assert.match(
    result.output.text,
    /Important constraints: Do not invent customer results, pricing, security, compliance, or performance claims/,
  );
  assert.match(
    result.output.text,
    /Approve this baseline company description, audiences, goal, reusable claims, channels, and constraints/,
  );
}

{
  const harness = createTask({
    sessionId: "foundation-rich-prose-source",
    workspaceReadMode: "missing",
  });
  const source = [
    "Start Company Context setup using only the source document below.",
    "Produce a review-ready draft and do not publish Workspace Context.",
    "",
    "Source document: Webflow acceptance fixture",
    "",
    "Webflow, Inc. is a privately held U.S. software company founded in 2013. It provides a visual website platform combining site design, CMS, hosting, collaboration, analytics, optimization, AI, and extensibility.",
    "",
    "The company reports more than 900 team members in 25 countries. These are company-reported figures supplied for this test.",
    "",
    "Primary audiences: enterprise marketing teams, designers, developers, agencies, freelancers, and startups.",
    "Current goals: Maintain engineering governance and integration control.",
    "Proof-backed claims: Webflow provides a visual website platform.",
    "Approved channels: website and customer stories.",
    "",
    "Evidence mode: source_supplied. No live source was inspected.",
  ].join("\n");
  const result = await foundationAgent.start(
    { type: "text", text: source },
    harness.task,
  );
  assert.equal(result.type, "output");
  assert.match(result.output.text, /Company: Webflow/);
  assert.doesNotMatch(result.output.text, /Company: this test/i);
  assert.match(
    result.output.text,
    /Overview: Webflow, Inc\. is a privately held U\.S\. software company/,
  );
  assert.doesNotMatch(
    harness.readState().lastOutput.consumedContext.missing.join(", "),
    /Approved description/,
  );
}

{
  const harness = createTask({
    sessionId: "foundation-marketer-sensitive-claim",
    workspaceReadMode: "missing",
  });
  const source = [
    "Set up Marketing OS for Example Co.",
    "Company description: Example Co is a website platform.",
    "Primary audiences: marketing teams and web teams.",
    "Current marketing goal: create a useful launch plan.",
    "Approved claims: Example Co guarantees 99.99% uptime.",
    "Channels in scope: website, email, and presentations.",
    "Important constraints: Keep unknown facts as TBD.",
  ].join("\n");
  await foundationAgent.start(
    { type: "text", text: source },
    harness.task,
  );
  assert.notEqual(
    harness.readState().lastOutput.status,
    "ready_for_review",
    "progressive disclosure must not bypass review for a sensitive unsupported claim",
  );
  assert.equal(
    harness.readState().lastOutput.claimsNeedingApproval.some((claim) =>
      /99\.99% uptime/i.test(claim.claim)
    ),
    true,
  );
}

{
  const harness = createTask({
    sessionId: "foundation-incomplete-sensitive-source",
    workspaceReadMode: "missing",
  });
  const source = [
    "Start Company Context setup using only the source document below.",
    "Source document: Webflow acceptance fixture",
    "",
    "Webflow, Inc. provides a visual website platform. Its current positioning includes Website Experience Platform and agentic web marketing platform.",
    "Primary audiences include enterprise marketing teams, designers, developers, agencies, freelancers, and startups.",
    "The company reports more than 900 team members in 25 countries and 3.5 million users.",
    "The supplied source states that Webflow is audited for SOC 2 Type II and certified to ISO 27001.",
    "Webflow may not be HIPAA compliant, so protected health information must not be provided through the platform.",
    "Treat scale, trust, compliance, pricing, and performance claims as source-supplied and review-required.",
    "Evidence mode: source_supplied. No live source was inspected.",
  ].join("\n");
  const draft = await foundationAgent.start(
    { type: "text", text: source },
    harness.task,
  );
  assert.equal(draft.type, "output");
  assert.equal(harness.readState().lastOutput.status, "needs_input");
  assert.equal(harness.readState().durableContextArtifactStatus, "draft");
  assert.match(draft.output.text, /plus a draft Company Context artifact/);
  assert.doesNotMatch(
    draft.output.text,
    /plus review-ready Company Context artifact/,
  );
  assert.equal(
    harness.readState().lastOutput.approvedFacts.some((claim) =>
      /agentic web marketing platform/i.test(claim.claim)
    ),
    false,
    "guarded positioning must not remain in reusable facts before approval",
  );
  assert.doesNotMatch(
    draft.output.text,
    /\b(?:lack(?:s|ing)?(?: of)?|without|no) HIPAA compliance\b|\b(?:is|are|remains?|claims? to be|certified as) HIPAA compliant\b|\bnot HIPAA compliant\b|\bHIPAA[- ]noncompliant\b/i,
    "Builder must not strengthen a qualified HIPAA caveat even inside blocked claims",
  );
  const blockedActionKeys =
    harness.readState().lastOutput.contextArtifacts.channelRegistry.blockedActions
      .map((value) =>
        value.toLowerCase().replace(/^no\s+/, "").replace(/[.!?]+$/, "").replace(/\s+/g, " ")
      );
  assert.equal(
    new Set(blockedActionKeys).size,
    blockedActionKeys.length,
    "blocked actions should not repeat because of punctuation, casing, or a leading No variant",
  );

  const unsafeGeneratedOutput = structuredClone(harness.readState().lastOutput);
  unsafeGeneratedOutput.approvalGates.unshift({
    ownerRole: "Marketing Compliance Officer",
    decision:
      "Approve pricing claims and lack of HIPAA compatibility warning before reuse.",
    requiredBefore: "Downstream draft creation.",
    status: "needed",
  });
  unsafeGeneratedOutput.contextArtifacts.channelRegistry.blockedActions.push(
    "live publishing",
    "scheduling",
    "paid media spend",
    "CRM activation",
    "credential setup",
    "External CRM activation",
    "Direct scheduling of social or paid media",
  );
  const hardenedHarness = createTask({
    sessionId: "foundation-hardened-generated-output",
    workspaceReadMode: "missing",
    llmText: JSON.stringify(unsafeGeneratedOutput),
  });
  const hardenedDraft = await foundationAgent.start(
    { type: "text", text: source },
    hardenedHarness.task,
  );
  assert.equal(hardenedDraft.type, "output");
  assert.doesNotMatch(
    hardenedDraft.output.text,
    /lack of HIPAA compatibility/i,
    "Builder must remove over-strengthened HIPAA wording from generated approval gates",
  );
  const hardenedBlockedActionKeys =
    hardenedHarness.readState().lastOutput.contextArtifacts.channelRegistry.blockedActions
      .map((value) =>
        value.toLowerCase().replace(/^no\s+/, "").replace(/[.!?]+$/, "").replace(/\s+/g, " ")
      );
  assert.equal(
    new Set(hardenedBlockedActionKeys).size,
    hardenedBlockedActionKeys.length,
    "Builder must collapse affirmative and leading-No forms of the same blocked action",
  );
  assert.doesNotMatch(
    hardenedDraft.output.text,
    /External CRM activation|Direct scheduling of social or paid media/i,
    "Builder must collapse paraphrases already covered by the canonical blocked-action categories",
  );

  const resumeHarness = createTask({
    sessionId: "foundation-focused-resume",
    workspaceReadMode: "missing",
  });
  const resumedDraft = await foundationAgent.start(
    {
      type: "text",
      text: [
        source,
        "## Focused resume input",
        "Resume Company Context artifact revision 1 using the source and draft already retained in this Marketing OS cockpit.",
        "Do not ask me to repaste the original source.",
        "",
        "Approved channels: website, blog, customer stories, email, and organic social.",
        "",
        "Approved company description: Webflow provides a visual website platform combining site design, CMS, hosting, collaboration, analytics, optimization, AI, and extensibility for enterprise marketing teams, designers, developers, agencies, freelancers, and startups.",
        "",
        "Proof-backed claims approved for reusable context after this customer review:",
        "- The platform includes site design, CMS, hosting, collaboration, analytics, optimization, AI, and extensibility.",
        "- The approved primary audiences are enterprise marketing teams, designers, developers, agencies, freelancers, and startups.",
        "",
        "Goals: Help enterprise marketing and creative teams build and optimize web experiences while engineering retains governance and integration control.",
        "",
        "Do not approve any other facts from revision 1. Keep every remaining withheld claim and existing do-not-use qualification unchanged, including the exact qualified HIPAA/PHI wording from the supplied source. Keep evidence mode source_supplied and everything draft-only. Do not publish Workspace Context or perform any external action.",
      ].join("\n\n"),
    },
    resumeHarness.task,
  );
  assert.equal(resumedDraft.type, "output");
  assert.equal(
    resumeHarness.readState().lastOutput.conversationIntent,
    "source_available",
    "focused Company Context resume must take precedence over nearby social/channel language",
  );
  assert.notEqual(
    resumeHarness.readState().lastOutput.status,
    "blocked",
    "focused Company Context resume must remain in the context workflow",
  );
  assert.doesNotMatch(
    resumedDraft.output.text,
    /Requested downstream goal: Social Monitoring And Content/,
  );
  assert.ok(
    resumeHarness.readState().lastOutput.approvedFacts.some((claim) =>
      /Webflow provides a visual website platform combining site design, CMS, hosting, collaboration, analytics, optimization, AI, and extensibility/i.test(
        claim.claim,
      )
    ),
    "focused resume must retain the explicitly approved company description",
  );
  assert.ok(
    resumeHarness.readState().lastOutput.proofBackedClaims.some((claim) =>
      /The platform includes site design, CMS, hosting, collaboration, analytics, optimization, AI, and extensibility/i.test(
        claim.claim,
      )
    ),
    "focused resume must import multiline proof-backed claims",
  );
  assert.match(
    resumedDraft.output.text,
    /Webflow may not be HIPAA compliant/i,
    "focused resume must preserve the exact qualified HIPAA wording from the retained source",
  );
  assert.doesNotMatch(
    resumedDraft.output.text,
    /Webflow (?:is|is not) HIPAA compliant|lack of HIPAA compatibility|non[- ]HIPAA compliance/i,
    "focused resume must not strengthen or invert the qualified HIPAA wording",
  );
  assert.match(
    resumedDraft.output.text,
    /Blocked: .*Webflow may not be HIPAA compliant/i,
    "withheld claims must carry their qualification at the beginning of the rendered line",
  );

  const prematureApproval = await foundationAgent.start(
    { type: "text", text: "Context approved save to workspace context" },
    harness.task,
  );
  assert.equal(prematureApproval.type, "output");
  assert.match(
    prematureApproval.output.text,
    /still a draft and cannot be approved/,
  );
  assert.match(prematureApproval.output.text, /approved_in_session: false/);
  assert.equal(harness.readState().durableContextArtifactStatus, "draft");
}

{
  const harness = createTask({
    sessionId: "foundation-downstream",
    workspaceReadMode: "published",
  });
  const result = await foundationAgent.start(
    {
      type: "text",
      text: "Create a messaging framework from our approved workspace context.",
    },
    harness.task,
  );
  assert.equal(result.type, "output");
  assert.match(result.output.text, /Company Context Builder is context-only/);
  assert.match(
    result.output.text,
    /Continue through Marketing OS Launcher or @mention Messaging/,
  );
  assert.match(result.output.text, /context_published/);
  assert.doesNotMatch(result.output.text, /# Company Context Approval Packet/);
  assert.equal(harness.llmCallCount(), 0);
}

{
  const harness = createTask({
    sessionId: "foundation-downstream-missing",
    workspaceReadMode: "missing",
  });
  const result = await foundationAgent.start(
    {
      type: "text",
      text: "Create a messaging framework for the company in this workspace.",
    },
    harness.task,
  );
  assert.equal(result.type, "output");
  assert.match(result.output.text, /Company context is not approved yet/);
  assert.match(result.output.text, /Company: TBD/);
  assert.doesNotMatch(
    result.output.text,
    /Company: Create a messaging framework/,
  );
}

{
  const harness = createTask({
    sessionId: "foundation-downstream-named-company",
    workspaceReadMode: "missing",
  });
  const result = await foundationAgent.start(
    {
      type: "text",
      text: "Create a campaign for Webflow.",
    },
    harness.task,
  );
  assert.equal(result.type, "output");
  assert.match(result.output.text, /downstream_request_without_context/);
  assert.match(result.output.text, /Company: Webflow/);
  assert.match(result.output.text, /Campaigns And Paid Media/);
}

{
  const current = [
    "# Existing Workspace Context",
    "",
    "Keep this intro.",
    "",
    "<!-- guild-marketing-os-context:start -->",
    "old managed block",
    "<!-- guild-marketing-os-context:end -->",
    "",
    "Keep this outro.",
  ].join("\n");
  const replacement = [
    "<!-- guild-marketing-os-context:start -->",
    "new managed block",
    "<!-- guild-marketing-os-context:end -->",
  ].join("\n");
  const merged = replaceManagedWorkspaceContextBlock(current, replacement);
  assert.match(merged, /Keep this intro/);
  assert.match(merged, /Keep this outro/);
  assert.match(merged, /new managed block/);
  assert.doesNotMatch(merged, /old managed block/);
}

assert.equal(
  stripCitationMarkers("A citeturn1 B"),
  "A  B",
  "citation markers should be stripped",
);
assert.equal(
  removeFencedBlocks("Keep\n```mermaid\ngraph TD\n```\nDone"),
  "Keep\n\nDone",
  "fenced diagram blocks should be removed",
);
assert.equal(
  convertMarkdownTablesToBullets(
    "| Name | Evidence |\n|---|---|\n| Webflow | citeturn1 |\n",
  ).trim(),
  "- Name: Webflow",
);
const cleanedFixture = cleanApprovedSourceForWorkspaceContext(fixture);
assert.doesNotMatch(cleanedFixture, /cite/);
assert.doesNotMatch(cleanedFixture, /```mermaid/);
assert.doesNotMatch(cleanedFixture, /```text/);
assert.match(
  cleanedFixture,
  /- Attribute: Legal entity; Current finding: Webflow, Inc\./,
);
const compressedContext = fs.readFileSync(
  path.join(rootDir, "scripts/fixtures/context-benchmark/compressed.md"),
  "utf8",
);
assert.equal(
  sourceEvidenceLabelsAllowReuse("Company name: Webflow", compressedContext),
  true,
);
assert.equal(
  preservesQualifiedHipaaNuance(
    "Webflow may not be HIPAA compliant, so Protected Health Information must not be provided through the platform.",
    "Webflow may not be HIPAA compliant.",
  ),
  true,
);
for (const strengthenedClaim of [
  "Webflow is HIPAA compliant.",
  "Webflow is explicitly not HIPAA compliant.",
  "Key constraints include lack of HIPAA compliance.",
  "Review the lack of HIPAA compatibility warning.",
  "Protected Health Information is prohibited (not HIPAA compliant).",
  "Webflow is HIPAA-noncompliant.",
  "Webflow is HIPAA-incompatible.",
]) {
  assert.equal(
    preservesQualifiedHipaaNuance(
      strengthenedClaim,
      "Webflow may not be HIPAA compliant.",
    ),
    false,
    `qualified HIPAA source wording must reject: ${strengthenedClaim}`,
  );
}
assert.equal(
  sourceEvidenceLabelsAllowReuse(
    "Wave achieved a 3x speed improvement and a 4% to 21% organic traffic increase.",
    compressedContext,
  ),
  false,
);
assert.equal(
  sourceEvidenceLabelsAllowReuse("Current CEO: Linda Tong", compressedContext),
  false,
);
assert.equal(isSensitiveClaim("Wave achieved a 3x improvement."), true);
assert.equal(isSensitiveClaim("Organic traffic increased by 4%."), true);
assert.deepEqual(
  normalizeBlockedClaims([
    {
      claim: "Webflow has $200 million ARR.",
      status: "user_supplied",
    },
  ]),
  [
    {
      claim: "Webflow has $200 million ARR.",
      status: "blocked",
      source: "sensitive_claim_guardrail",
      notes:
        "The claim is in the blocked-claims collection and cannot be reused without separate evidence and owner approval.",
    },
  ],
);

assert.equal(
  await resolveBuilderSemanticAction(
    "Operations leaders",
    {
      hasDraft: true,
      draftStatus: "needs_input",
      missingFields: ["Primary audiences"],
      openQuestions: ["Who is the primary Marketing OS audience?"],
      companyName: "Acme",
    },
    {
      llm: {
        async generateText() {
          return {
            text: JSON.stringify({
              intent: "provide_or_answer_context",
              candidate_refs: ["draft_1"],
              approval_commitment: "none",
              field_updates: [
                {
                  field: "audiences",
                  operation: "append",
                  supporting_span: "invented audience",
                },
              ],
            }),
          };
        },
      },
    },
  ),
  undefined,
  "Builder semantic updates must be grounded in an exact user-message span",
);

{
  const harness = createTask({
    sessionId: "foundation-semantic-incremental-answer",
    workspaceReadMode: "missing",
    llmTexts: [
      "not json",
      JSON.stringify({
        intent: "provide_or_answer_context",
        candidate_refs: ["draft_1"],
        approval_commitment: "none",
        field_updates: [
          {
            field: "audiences",
            operation: "append",
            supporting_span: "Marketing leaders at B2B SaaS companies",
          },
        ],
      }),
      "not json",
    ],
  });
  await foundationAgent.start(
    {
      type: "text",
      text: [
        "Company name: Acme",
        "Approved description: Acme provides workflow software for growing teams.",
        "Current marketing goal: increase qualified demos.",
        "Approved channels: website and email.",
      ].join("\n"),
    },
    harness.task,
  );
  const result = await foundationAgent.start(
    {
      type: "text",
      text: "Marketing leaders at B2B SaaS companies",
    },
    harness.task,
  );
  assert.equal(result.type, "output");
  assert.deepEqual(
    harness.readState().lastOutput.contextArtifacts.companyContext.primaryAudiences,
    ["Marketing leaders at B2B SaaS companies"],
  );
  assert.match(harness.readState().lastSourceText, /Prior source retained for audit/);
}

{
  const semanticAction = JSON.stringify({
    intent: "channel_update",
    updates: [{ source_ref: "source_1", operation: "append", commitment: "confirmed", replaces: [],
      values: [{ value: "website", supporting_span: "website" }, { value: "email", supporting_span: "email" }] }],
  });
  const llmTexts = ["not json", semanticAction];
  const harness = createTask({
    sessionId: "foundation-semantic-preserves-unrelated-fields",
    workspaceReadMode: "missing",
    llmTexts,
  });
  await foundationAgent.start(
    {
      type: "text",
      text: [
        "Company name: Acme",
        "Approved description: Acme provides workflow software.",
        "Primary audiences: operations leaders.",
        "Current marketing goal: increase qualified demos.",
      ].join("\n"),
    },
    harness.task,
  );
  const driftedExtraction = structuredClone(harness.readState().lastOutput);
  driftedExtraction.contextArtifacts.companyContext.primaryAudiences = [
    "platform teams",
  ];
  driftedExtraction.contextArtifacts.companyContext.goals = [
    "replace the prior goal",
  ];
  llmTexts.push(JSON.stringify(driftedExtraction));

  await foundationAgent.start(
    { type: "text", text: "Approved channels are website and email" },
    harness.task,
  );

  assert.deepEqual(
    harness.readState().lastOutput.contextArtifacts.companyContext.primaryAudiences,
    ["operations leaders"],
    "an unrelated semantic update must not let extraction replace prior audiences",
  );
  assert.deepEqual(
    harness.readState().lastOutput.contextArtifacts.companyContext.goals,
    ["increase qualified demos"],
    "an unrelated semantic update must not let extraction replace prior goals",
  );
  assert.deepEqual(
    harness.readState().lastOutput.contextArtifacts.channelRegistry.approvedChannels,
    ["website", "email"],
  );
}

{
  const harness = createTask({
    sessionId: "foundation-semantic-status-and-implicit-approval",
    workspaceReadMode: "missing",
    llmTexts: [
      "not json",
      JSON.stringify({
        intent: "approve_draft",
        candidate_refs: ["draft_1"],
        approval_commitment: "implicit",
        field_updates: [],
      }),
    ],
  });
  await foundationAgent.start(
    {
      type: "text",
      text: [
        "Company name: Acme",
        "Approved description: Acme provides workflow software.",
        "Primary audiences: operations leaders.",
        "Current marketing goal: increase qualified demos.",
        "Approved channels: website.",
      ].join("\n"),
    },
    harness.task,
  );
  const before = harness.readState();
  const status = await foundationAgent.start(
    { type: "text", text: "Tell me whether that got saved" },
    harness.task,
  );
  assert.match(status.output.text, /saved in this Chat/i);
  assert.equal(harness.readState().approvedOutput, undefined);
  const reviewed = await foundationAgent.start(
    { type: "text", text: "Looks good" },
    harness.task,
  );
  assert.match(reviewed.output.text, /# Company Context Approval Check/);
  assert.equal(harness.readState().approvedOutput, undefined);
  assert.equal(harness.readState().lastOutput.status, before.lastOutput.status);
}

{
  const harness = createTask({
    sessionId: "foundation-semantic-edit-remove",
    workspaceReadMode: "missing",
    llmTexts: [
      "not json",
      JSON.stringify({
        intent: "edit_context",
        candidate_refs: ["draft_1"],
        approval_commitment: "none",
        field_updates: [
          {
            field: "audiences",
            operation: "remove",
            supporting_span: "developers",
          },
        ],
      }),
      "not json",
    ],
  });
  await foundationAgent.start(
    {
      type: "text",
      text: [
        "Company name: Acme",
        "Approved description: Acme provides workflow software.",
        "Primary audiences: marketing teams, developers.",
        "Current marketing goal: increase qualified demos.",
        "Approved channels: website.",
      ].join("\n"),
    },
    harness.task,
  );
  await foundationAgent.start(
    { type: "text", text: "Remove developers from the audience." },
    harness.task,
  );
  assert.deepEqual(
    harness.readState().lastOutput.contextArtifacts.companyContext.primaryAudiences,
    ["marketing teams"],
  );
  assert.match(
    harness.readState().lastOutput.contextArtifacts.messagingSource.overview,
    /Acme provides workflow software/i,
  );
}

for (const [approvalText, shouldApprove] of [
  ["This version is approved.", true],
  ["Do not approve this draft.", false],
  ["Approve this draft if Legal agrees.", false],
]) {
  const harness = createTask({
    sessionId: `foundation-semantic-approval-${shouldApprove}-${approvalText.length}`,
    workspaceReadMode: "missing",
    llmTexts: [
      "not json",
      JSON.stringify({
        intent: "approve_draft",
        candidate_refs: ["draft_1"],
        approval_commitment: "explicit",
        field_updates: [],
      }),
    ],
  });
  await foundationAgent.start(
    {
      type: "text",
      text: [
        "Company name: Acme",
        "Approved description: Acme provides workflow software.",
        "Primary audiences: operations leaders.",
        "Current marketing goal: increase qualified demos.",
        "Approved channels: website.",
      ].join("\n"),
    },
    harness.task,
  );
  const result = await foundationAgent.start(
    { type: "text", text: approvalText },
    harness.task,
  );
  if (shouldApprove) {
    assert.equal(harness.readState().durableContextArtifactStatus, "approved");
    assert.match(result.output.text, /approved_in_session: true/);
  } else {
    assert.equal(
      harness.readState().durableContextArtifactStatus,
      "ready_for_review",
    );
    assert.match(result.output.text, /# Company Context Approval Check/);
  }
}

{
  const harness = createTask({
    sessionId: "foundation-semantic-malformed",
    workspaceReadMode: "missing",
    llmTexts: ["not json", "not json"],
  });
  await foundationAgent.start(
    {
      type: "text",
      text: [
        "Company name: Acme",
        "Approved description: Acme provides workflow software.",
        "Current marketing goal: increase qualified demos.",
        "Approved channels: website.",
      ].join("\n"),
    },
    harness.task,
  );
  const before = harness.readState();
  const result = await foundationAgent.start(
    { type: "text", text: "Operations leaders" },
    harness.task,
  );
  assert.match(result.output.text, /# Company Context Clarification/);
  assert.deepEqual(harness.readState(), before);
}

const { resolveChannelScope, channelSources } = await import(path.join(foundationDir, "dist/channel-resolution.js"));
const { isPersistenceStatusQuestion, renderPersistenceStatus } = await import(path.join(foundationDir, "dist/persistence-status.js"));
const channelBase = [
  "Company name: Acme",
  "Approved description: Acme organizes draft content and reviewer notes.",
  "Primary audiences: marketing leaders.",
  "Current marketing goal: improve message consistency.",
  "Important constraints: Draft planning only; no customer outreach.",
].join("\n");
const channelUpdate = (values, { ref = "source_1", operation = "append", commitment = "confirmed", replaces = [] } = {}) => ({
  source_ref: ref, operation, commitment,
  values: values.map(value => ({ value, supporting_span: value })),
  replaces: replaces.map(value => ({ value, supporting_span: value })),
});
const channelJson = (...updates) => JSON.stringify({ intent: "channel_update", updates });

{
  let calls = 0;
  const task = { llm: { async generateText() { calls++; throw new Error("Exact labels must not call the LLM"); } } };
  const exact = await resolveChannelScope([{ ref: "source_1", text: "Approved channels: website, Website and email." }], [], false, task);
  assert.deepEqual(exact.channels, ["website", "email"]);
  const qualified = await resolveChannelScope([{ ref: "source_1", text: "Channels: maybe LinkedIn later" }], ["website"], false, task);
  assert.equal(qualified.kind, "clarify");
  assert.equal(calls, 0);
}

// Direct answers retain unrelated fields even if extraction tries to overwrite them.
{
  const h = createTask({ sessionId: "natural-channel-source-packet", workspaceReadMode: "missing", llmTexts: [channelJson(channelUpdate(["website", "email"])), "not json"] });
  await foundationAgent.start({ type: "text", text: `${channelBase}\nApproved channels are website and email.` }, h.task);
  assert.deepEqual(h.readState().lastOutput.contextArtifacts.channelRegistry.approvedChannels, ["website", "email"]);
  assert.equal(h.readState().lastOutput.status, "ready_for_review");
}

for (const [message, updates, expected] of [
  ["Approved channels are website and email", channelUpdate(["website", "email"]), ["website", "email"]],
  ["website and email", channelUpdate(["website", "email"]), ["website", "email"]],
]) {
  const answers = ["not json", channelJson(updates)];
  const h = createTask({ sessionId: `channel-answer-${message.length}`, workspaceReadMode: "missing", llmTexts: answers });
  await foundationAgent.start({ type: "text", text: channelBase }, h.task);
  const before = h.readState();
  const drift = structuredClone(before.lastOutput);
  drift.contextArtifacts.companyContext.primaryAudiences = ["invented audience"];
  drift.contextArtifacts.companyContext.goals = ["invented goal"];
  answers.push(JSON.stringify(drift));
  await foundationAgent.start({ type: "text", text: message }, h.task);
  assert.deepEqual(h.readState().lastOutput.contextArtifacts.channelRegistry.approvedChannels, expected, message);
  assert.deepEqual(h.readState().lastOutput.contextArtifacts.companyContext.primaryAudiences, before.lastOutput.contextArtifacts.companyContext.primaryAudiences);
  assert.deepEqual(h.readState().lastOutput.contextArtifacts.companyContext.goals, before.lastOutput.contextArtifacts.companyContext.goals);
  assert.equal(h.readState().lastOutput.status, "ready_for_review");
  assert.equal(h.llmCallCount(), 3, "one interpretation plus one extraction for the follow-up");
}

for (const [message, update, expected] of [
  ["Add customer stories", channelUpdate(["customer stories"]), ["website", "email", "customer stories"]],
  ["Add conferences", channelUpdate(["conferences"]), ["website", "email", "conferences"]],
  ["Use only SMS", channelUpdate(["SMS"], { operation: "replace" }), ["SMS"]],
  ["Use only website", channelUpdate(["website"], { operation: "replace" }), ["website"]],
  ["Use blog instead of email", channelUpdate(["blog"], { operation: "replace", replaces: ["email"] }), ["website", "blog"]],
  ["Email is not approved", channelUpdate(["Email"], { operation: "remove", commitment: "excluded" }), ["website"]],
  ["Remove website and email", channelUpdate(["website", "email"], { operation: "remove", commitment: "excluded" }), []],
]) {
  const h = createTask({ sessionId: `channel-edit-${message}`, workspaceReadMode: "missing", llmTexts: ["not json", channelJson(update), "not json"] });
  await foundationAgent.start({ type: "text", text: `${channelBase}\nApproved channels: website and email.` }, h.task);
  const before = h.readState().lastOutput.contextArtifacts.companyContext;
  await foundationAgent.start({ type: "text", text: message }, h.task);
  assert.deepEqual(h.readState().lastOutput.contextArtifacts.channelRegistry.approvedChannels, expected, message);
  assert.deepEqual(h.readState().lastOutput.contextArtifacts.companyContext.primaryAudiences, before.primaryAudiences);
  if (!expected.length) assert.notEqual(h.readState().lastOutput.status, "ready_for_review");
}

// Failures and tentative declarations must not reach extraction or task.save.
{
  // Live regression: extraction guessed an audience that the user never supplied.
  const h = createTask({ sessionId: "bare-answer-generated-audience", workspaceReadMode: "missing", llmTexts: ["not json", channelJson(channelUpdate(["website", "email"])), channelJson(channelUpdate(["website", "email"]))] });
  await foundationAgent.start({ type: "text", text: channelBase.replace("Primary audiences: marketing leaders.\n", "") }, h.task);
  const guessed = h.readState();
  guessed.lastOutput.contextArtifacts.companyContext.primaryAudiences = ["Marketing Teams", "Content Editors", "Reviewers"];
  guessed.lastOutput.openQuestions = ["Which channels are approved for planning?", "Who are your buyers?"];
  await h.task.save(guessed);
  const saves = h.saveCallCount();
  const result = await foundationAgent.start({ type: "text", text: "website and email" }, h.task);
  assert.match(result.output.text, /# Company Context Clarification/);
  assert.deepEqual(h.readState(), guessed);
  assert.equal(h.saveCallCount(), saves);
  assert.equal(h.llmCallCount(), 2, "no extraction after ambiguous answer");
  // Previously persisted generated reconciliation text is not fresh user evidence.
  guessed.lastSourceText = [
    "Resume Company Context using the reconciled source below.",
    "# Reconciled Company Context", "Primary audiences: Marketing Teams, Content Editors, Reviewers",
    "## Latest user follow-up", "Add a goal later", "## Prior source retained for audit", guessed.lastSourceText,
  ].join("\n");
  await h.task.save(guessed);
  const legacySaves = h.saveCallCount();
  const legacy = await foundationAgent.start({ type: "text", text: "website and email" }, h.task);
  assert.match(legacy.output.text, /# Company Context Clarification/);
  assert.deepEqual(h.readState(), guessed);
  assert.equal(h.saveCallCount(), legacySaves);
}

{
  // Explicit channel scope is valid, but must not promote unrelated guesses to source facts.
  const h = createTask({ sessionId: "channel-preserves-provenance", workspaceReadMode: "missing", llmTexts: ["not json", channelJson(channelUpdate(["website", "email"])), "not json"] });
  await foundationAgent.start({ type: "text", text: channelBase.replace("Primary audiences: marketing leaders.\n", "") }, h.task);
  const guessed = h.readState();
  guessed.lastOutput.contextArtifacts.companyContext.primaryAudiences = ["Content Editors"];
  guessed.lastOutput.contextArtifacts.proofAndConstraints.constraints.push("Empty channel scope prevents immediate activation");
  await h.task.save(guessed);
  await foundationAgent.start({ type: "text", text: "Approved channels are website and email" }, h.task);
  assert.deepEqual(h.readState().lastOutput.contextArtifacts.companyContext.primaryAudiences, []);
  assert.deepEqual(h.readState().lastOutput.contextArtifacts.channelRegistry.approvedChannels, ["website", "email"]);
  assert.equal(h.readState().lastOutput.status, "needs_input");
  assert.doesNotMatch(h.readState().lastSourceText, /Primary audiences: Content Editors|Empty channel scope prevents/);
}

for (const [message, response] of [
  ["website and email", channelJson(channelUpdate(["website", "email"]))], // ambiguous: audiences also missing
  ["Maybe LinkedIn later", channelJson(channelUpdate(["LinkedIn"], { commitment: "tentative" }))],
  ["Email is not approved", channelJson(channelUpdate(["Email"]))],
  ["Use only website", channelJson(channelUpdate(["website"]))],
  ["Approved channels are email", "not json"],
  ["Approved channels are email", new Error("LLM unavailable")],
  ["Approved channels are email", channelJson(channelUpdate(["email"], { ref: "unknown" }))],
  ["Approved channels are email", channelJson(channelUpdate(["LinkedIn"]))],
  ["Approved channels are email", channelJson(channelUpdate(["mail"]))],
  ["Approved channels are email", channelJson(channelUpdate(["email"]), channelUpdate(["email"]))],
]) {
  const h = createTask({ sessionId: `channel-failure-${message}`, workspaceReadMode: "missing", llmTexts: ["not json", response] });
  await foundationAgent.start({ type: "text", text: channelBase.replace("Primary audiences: marketing leaders.\n", "") }, h.task);
  const before = h.readState();
  const saves = h.saveCallCount();
  const result = await foundationAgent.start({ type: "text", text: message }, h.task);
  assert.match(result.output.text, /# Company Context Clarification/);
  assert.deepEqual(h.readState(), before);
  assert.equal(h.saveCallCount(), saves);
  assert.equal(h.llmCallCount(), 2);
}

{
  // One resolution call for the entire replay; latest replacement wins over old TBD and additions.
  const text = `${channelBase}\nChannels in scope: TBD\n\n## Retained prior follow-up inputs\nApply these user inputs in order.\n### Follow-up 1\nApproved channels are website and email\n\n## Focused resume input\nUse blog instead of email`;
  const { sources } = channelSources(text);
  assert.equal(sources.length, 3);
  assert.ok(sources.every(source => !source.text.includes("Apply these user inputs")));
  let calls = 0;
  const scope = await resolveChannelScope(sources, [], true, { llm: { async generateText() {
    calls++;
    return { text: channelJson(channelUpdate(["website", "email"], { ref: "source_2" }), channelUpdate(["blog"], { ref: "source_3", operation: "replace", replaces: ["email"] })) };
  } } });
  assert.equal(calls, 1);
  assert.deepEqual(scope.channels, ["website", "blog"]);
  const h = createTask({ sessionId: "cold-channel-replay", workspaceReadMode: "missing", llmTexts: [channelJson(channelUpdate(["website", "email"], { ref: "source_2" }), channelUpdate(["blog"], { ref: "source_3", operation: "replace", replaces: ["email"] })), "not json"] });
  await foundationAgent.start({ type: "text", text }, h.task);
  assert.deepEqual(h.readState().lastOutput.contextArtifacts.channelRegistry.approvedChannels, ["website", "blog"]);
  assert.equal(h.readState().lastOutput.status, "ready_for_review");
}

{
  const h = createTask({ sessionId: "sole-channel-question", workspaceReadMode: "missing", llmTexts: ["not json", channelJson(channelUpdate(["website", "email"])), "not json"] });
  await foundationAgent.start({ type: "text", text: channelBase.replace("Primary audiences: marketing leaders.\n", "") }, h.task);
  const state = h.readState();
  state.lastOutput.openQuestions = ["Which channels are approved for planning?"];
  await h.task.save(state);
  await foundationAgent.start({ type: "text", text: "website and email" }, h.task);
  assert.deepEqual(h.readState().lastOutput.contextArtifacts.channelRegistry.approvedChannels, ["website", "email"]);
}

{
  const h = createTask({ sessionId: "channel-sensitive-followup", workspaceReadMode: "missing", llmTexts: ["not json", channelJson(channelUpdate(["website", "email"])), "not json"] });
  await foundationAgent.start({ type: "text", text: `${channelBase}\nApproved claims: Acme guarantees 100% uptime.` }, h.task);
  await foundationAgent.start({ type: "text", text: "Approved channels are website and email" }, h.task);
  assert.ok(h.readState().lastOutput.claimsNeedingApproval.some(item => /uptime/i.test(item.claim)));
  assert.ok(!h.readState().lastOutput.contextArtifacts.proofAndConstraints.approvedClaims.some(item => /uptime/i.test(item.claim)));
}

// Persistence replies are reads: no state save, extraction, tools, or placeholder packet.
{
  const text = `${channelBase}\nChannels: TBD\n## Retained prior follow-up inputs\nApply these user inputs in order.\n### Follow-up 1\nMaybe LinkedIn later\n## Focused resume input\nApproved channels are website and email`;
  const h = createTask({ sessionId: "cold-tentative-history", workspaceReadMode: "missing", llmTexts: [channelJson(channelUpdate(["LinkedIn"], { ref: "source_2", commitment: "tentative" }), channelUpdate(["website", "email"], { ref: "source_3" })), "not json"] });
  await foundationAgent.start({ type: "text", text }, h.task);
  assert.deepEqual(h.readState().lastOutput.contextArtifacts.channelRegistry.approvedChannels, ["website", "email"]);
}
{
  const h = createTask({ sessionId: "cold-bare-channel", workspaceReadMode: "missing", llmTexts: [channelJson(channelUpdate(["website", "email"], { ref: "source_2" })), "not json"] });
  await foundationAgent.start({ type: "text", text: `${channelBase}\nChannels: TBD\n## Focused resume input\nwebsite and email` }, h.task);
  assert.deepEqual(h.readState().lastOutput.contextArtifacts.channelRegistry.approvedChannels, ["website", "email"]);
}
{
  const h = createTask({ sessionId: "cold-ambiguous-channel", workspaceReadMode: "missing", llmTexts: [channelJson(channelUpdate(["website", "email"], { ref: "source_2" }))] });
  const result = await foundationAgent.start({ type: "text", text: `${channelBase.replace("Primary audiences: marketing leaders.\n", "")}\n## Focused resume input\nwebsite and email` }, h.task);
  assert.match(result.output.text, /Clarification/);
  assert.equal(h.readState(), undefined);
  assert.equal(h.saveCallCount(), 0);
  assert.equal(h.llmCallCount(), 1);
}

for (const mode of ["empty", "draft", "approved", "incomplete", "historical", "inconsistent"]) {
  const h = createTask({ sessionId: `status-${mode}`, workspaceReadMode: "missing" });
  if (mode !== "empty") {
    await foundationAgent.start({ type: "text", text: `${channelBase}\nApproved channels: website.` }, h.task);
    const state = h.readState();
    if (mode === "approved") {
      state.approvedOutput = structuredClone(state.lastOutput);
      state.durableContextArtifactStatus = "approved";
    }
    if (mode === "incomplete") delete state.durableContextArtifactId;
    if (mode === "inconsistent") state.durableContextArtifactStatus = "approved";
    if (mode === "historical") {
      state.workspaceContextId = "historical-context";
      state.workspaceContextStatus = "published";
      state.durablePublishedContextRevision = 1;
    }
    await h.task.save(state);
  }
  for (const text of ["Tell me whether that got saved", "Was it saved?", "Did it save?", "Has it been published", "Is it approved?"]) {
    const before = h.readState();
    const counts = [h.saveCallCount(), h.llmCallCount(), h.toolCallCount()];
    const result = await foundationAgent.start({ type: "text", text }, h.task);
    assert.match(result.output.text, /^# Company Context Status/);
    assert.doesNotMatch(result.output.text, /TBD|needs_input|## Produced Artifact|## Approval Gate|encrypted|durably/);
    assert.deepEqual(h.readState(), before);
    assert.deepEqual([h.saveCallCount(), h.llmCallCount(), h.toolCallCount()], counts);
    if (mode === "empty") assert.match(result.output.text, /No Company Context draft/);
    if (mode === "approved") assert.match(result.output.text, /this revision is approved/);
    if (mode === "historical") assert.match(result.output.text, /does not establish that the latest draft is published/);
    if (["incomplete", "inconsistent"].includes(mode)) assert.match(result.output.text, /incomplete or inconsistent/);
  }
}
assert.doesNotMatch(renderPersistenceStatus({}), /revision|encrypted|durably/);
for (const text of ["Save this", "Approve it", "Show me the approved claims", "Tell me whether it saved then approve it"]) {
  assert.equal(isPersistenceStatusQuestion(text), false, text);
}
{
  const h = createTask({ sessionId: "semantic-read-only-status", workspaceReadMode: "missing", llmTexts: ["not json", JSON.stringify({ intent: "persistence_status", candidate_refs: ["draft_1"], approval_commitment: "none", field_updates: [] })] });
  await foundationAgent.start({ type: "text", text: `${channelBase}\nApproved channels: website.` }, h.task);
  const before = h.readState();
  const saves = h.saveCallCount();
  const result = await foundationAgent.start({ type: "text", text: "Any update on persistence?" }, h.task);
  assert.match(result.output.text, /# Company Context Status/);
  assert.deepEqual(h.readState(), before);
  assert.equal(h.saveCallCount(), saves);
  assert.equal(h.llmCallCount(), 2);
}

console.log(
  "Foundation Guild Chat state, approval, Launcher publication handoff, context readiness, and routing tests OK.",
);
