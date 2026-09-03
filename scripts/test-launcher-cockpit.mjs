#!/usr/bin/env node

import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const launcherDir = path.join(process.cwd(), "agents/launcher");
const build = spawnSync("npm", ["run", "build"], {
  cwd: launcherDir,
  encoding: "utf8",
  maxBuffer: 20 * 1024 * 1024,
});
if (build.status !== 0) {
  process.stderr.write(`${build.stdout ?? ""}${build.stderr ?? ""}`);
  process.exit(build.status ?? 1);
}

const [
  { default: launcher },
  launcherCore,
  launcherState,
  { suitePackageBindings },
] = await Promise.all([
  import(path.join(launcherDir, "dist/agent.js")),
  import(path.join(launcherDir, "dist/launcher-core.js")),
  import(path.join(launcherDir, "dist/launcher-state.js")),
  import(path.join(launcherDir, "dist/suite-binding.js")),
]);

const managedContext = [
  "<!-- guild-marketing-os-context:start -->",
  "Status: published",
  "## Workspace Context Brief",
  "Company: Example Co.",
  "Approved proof: supplied customer interviews only.",
  "Blocked actions: publishing, scheduling, spend, and CRM mutation.",
  "<!-- guild-marketing-os-context:end -->",
].join("\n");

const validArtifact = `
## Consumed Context
Published context revision consumed.

## Produced Artifact
Draft positioning and message pillars.

## Assumptions And Missing Evidence
Evidence mode: source_supplied. No live sources were inspected.

## Approval Gate
Marketing Owner review is required.

## AEO / AI-Readiness Contribution
Draft answer-ready language for review.

## Status Payload
\`\`\`json
{"evidence_mode":"source_supplied","observed_at":null,"source_coverage":["published workspace context"],"coverage_limitations":["No connected source was inspected."],"status":"ready_for_review","safety":{"action_mode":"draft_only","external_mutation_requested":false,"blocked_actions":["live publishing"],"unsupported_claims":[],"evidence_gaps":[]}}
\`\`\`

## Downstream Handoff
Return the completed artifact to Marketing OS for review.
`.trim();

const companyContextArtifact = `
## Consumed Context
User-supplied company packet for Example Co.

## Produced Artifact
### Company Context Draft (company-context)
- Company: Example Co.
- Category: Workflow software.

### Ready-To-Publish Workspace Context
\`\`\`text
Company: Example Co.
Readiness: review_ready
Primary audiences: Operations leaders
Approved proof: Supplied customer interviews only
Blocked actions: publishing, scheduling, spend, and CRM mutation
\`\`\`

### Context For Downstream Agents
\`\`\`text
Company: Example Co.
Use approved customer-interview proof only.
\`\`\`

## Assumptions And Missing Evidence
Evidence mode: source_supplied. Pricing and compliance proof are missing.

## Approval Gate
Company Context Owner review is required.

## AEO / AI-Readiness Contribution
Draft answer-ready company language for review.

## Status Payload
\`\`\`json
{"evidence_mode":"source_supplied","observed_at":null,"source_coverage":["user-supplied company packet"],"coverage_limitations":["No connected source was inspected."],"status":"ready_for_review","safety":{"action_mode":"draft_only","external_mutation_requested":false,"blocked_actions":["live publishing"],"unsupported_claims":[],"evidence_gaps":["pricing","compliance"]}}
\`\`\`

## Downstream Handoff
Return the approved compact brief to Marketing OS for explicit context publication.
`.trim();

const malformedArtifact = `
## Consumed Context
Published context revision consumed.

## Produced Artifact
Draft positioning.
`.trim();

const needsInputArtifact = validArtifact.replace(
  '"status":"ready_for_review"',
  '"status":"needs_input"',
);

function installedAgents() {
  return launcherCore.suiteInstallOrder.map((entry, index) => ({
    package_name:
      suitePackageBindings[entry.route].qualifiedName,
    version_id: `version-${index + 1}`,
  }));
}

function createChat({
  sessionId,
  specialist,
  initialState,
  installed = installedAgents(),
  initialContexts,
  failSave = false,
  failInstallAtCall,
  llmResponses = [],
}) {
  let state = initialState;
  let specialistCalls = 0;
  let installationCalls = 0;
  const installationAgentIds = [];
  const notifications = [];
  const specialistInputs = [];
  const llmPrompts = [];
  let llmCall = 0;
  let saves = 0;
  let workspaceReads = 0;
  const contexts = initialContexts ?? [
    {
      id: "context-original",
      status: "PUBLISHED",
      manual_context: "# Unmanaged workspace note\nKeep this text.",
      summary: "Original context",
    },
  ];

  const specialistTool = async (input) => {
    specialistCalls += 1;
    specialistInputs.push(input);
    return specialist(input, specialistCalls);
  };

  const task = {
    sessionId,
    tools: {
      async ui_notify(event) {
        notifications.push(event);
      },
      async guild_get_task_workspace_agents() {
        workspaceReads++;
        return installed;
      },
      async guild_get_agent_version() {
        return { version_number: "1.3.0" };
      },
      async guild_agent_install_request({ agent_id }) {
        installationCalls += 1;
        installationAgentIds.push(agent_id);
        if (installationCalls === failInstallAtCall) {
          throw new Error("installation denied");
        }
        const entry = launcherCore.suiteInstallOrder.find(
          (candidate) => candidate.agentId === agent_id,
        );
        if (!entry) throw new Error("unexpected installation target");
        installed.push({
          package_name: suitePackageBindings[entry.route].qualifiedName,
          version_id: `installed-${installationCalls}`,
        });
        return { id: `workspace-agent-${installationCalls}` };
      },
      marketing_os_company_context_builder: specialistTool,
      marketing_os_market_signal: specialistTool,
      marketing_os_icp: specialistTool,
      marketing_os_audience_segmentation: specialistTool,
      marketing_os_messaging: specialistTool,
      marketing_os_branding_pitch_deck: specialistTool,
      marketing_os_social_monitoring_content: specialistTool,
      marketing_os_campaigns_paid_media: specialistTool,
    },
    llm: {
      async generateText({ prompt }) {
        llmPrompts.push(prompt);
        const response = llmResponses[llmCall];
        llmCall += 1;
        return {
          text:
            typeof response === "function"
              ? await response(prompt)
              : response ?? "guide",
        };
      },
    },
    async restore() {
      return state;
    },
    async save(value) {
      saves++;
      if (failSave) throw new Error("Guild state unavailable");
      state = structuredClone(value);
    },
  };

  return {
    saveCallCount: () => saves,
    workspaceReadCount: () => workspaceReads,
    task,
    specialistInputs,
    contexts,
    readState() {
      return structuredClone(state);
    },
    specialistCallCount() {
      return specialistCalls;
    },
    installationCallCount() {
      return installationCalls;
    },
    installationAgentIds() {
      return [...installationAgentIds];
    },
    notifications() {
      return [...notifications];
    },
    llmPrompts() {
      return [...llmPrompts];
    },
  };
}

function launcherInput(request, context = managedContext) {
  return {
    type: "text",
    text: `${context}\n\n${request}`,
  };
}

{
  const acceptancePrompt = [
    "Start Company Context setup using only the source document below.",
    "Produce a review-ready draft and do not publish Workspace Context.",
    "",
    "Source document: Webflow acceptance fixture",
    "",
    "Webflow is a visual website platform.",
    "Primary audiences include marketers, designers, developers, and agencies.",
    "Keep everything draft-only.",
  ].join("\n");
  assert.equal(
    launcherCore.deterministicRoute(acceptancePrompt),
    "company_context",
  );

  const chat = createChat({
    sessionId: "company-context-start-acceptance-language",
    specialist: async () => ({
      type: "text",
      text: companyContextArtifact,
    }),
    initialContexts: [
      {
        id: "context-original",
        status: "PUBLISHED",
        manual_context: "# Unmanaged workspace note\nKeep this text.",
        summary: "Original context",
      },
    ],
  });
  const result = await launcher.run(
    launcherInput(acceptancePrompt, ""),
    chat.task,
  );
  assert.match(result.text, /Handled by: Company Context Builder/);
  assert.equal(chat.specialistCallCount(), 1);
  assert.equal(chat.readState().runs[0].route, "company_context");
  assert.equal(chat.readState().runs[0].status, "ready_for_review");
  assert.equal(chat.contexts.length, 1);
  assert.equal(chat.contexts[0].id, "context-original");
}

{
  const chat = createChat({
    sessionId: "sequential-onboarding",
    specialist: async () => {
      throw new Error("onboarding must not call a specialist");
    },
    installed: [],
  });

  const result = await launcher.run(
    launcherInput("Continue Marketing OS onboarding."),
    chat.task,
  );
  assert.equal(chat.installationCallCount(), 8);
  assert.deepEqual(
    chat.installationAgentIds(),
    launcherCore.suiteInstallOrder.map((entry) => entry.agentId),
  );
  assert.match(result.text, /All eight marketing specialists are installed/);
  assert.match(result.text, /8 Marketing OS specialists were installed/);
  assert.match(
    result.text,
    /Each installation required its own explicit approval/,
  );
  assert.doesNotMatch(result.text, /Continue onboarding to verify/);
  assert.equal(chat.notifications().length, 9);
  assert.match(JSON.stringify(chat.notifications()), /Installing specialist 1 of 8/);
  assert.match(JSON.stringify(chat.notifications()), /setup verified/);
}

{
  const chat = createChat({
    sessionId: "resumable-onboarding-denial",
    specialist: async () => {
      throw new Error("onboarding must not call a specialist");
    },
    installed: [],
    failInstallAtCall: 3,
  });

  const blocked = await launcher.run(
    launcherInput("Continue Marketing OS onboarding."),
    chat.task,
  );
  assert.equal(chat.installationCallCount(), 3);
  assert.match(blocked.text, /ICP is still unavailable/);
  assert.match(blocked.text, /Company Context Builder, Market Signal/);
  assert.match(blocked.text, /Onboarding stopped immediately/);
  assert.match(blocked.text, /No later package was requested/);

  const resumed = await launcher.run(
    launcherInput("Continue Marketing OS onboarding."),
    chat.task,
  );
  assert.equal(chat.installationCallCount(), 9);
  assert.match(resumed.text, /All eight marketing specialists are installed/);
  assert.match(resumed.text, /6 Marketing OS specialists were installed/);
}

{
  const chat = createChat({
    sessionId: "natural-first-message",
    specialist: async () => {
      throw new Error("first-run onboarding must not call a specialist");
    },
    installed: [],
  });
  const result = await launcher.run(
    launcherInput("Let’s get started", ""),
    chat.task,
  );
  assert.match(result.text, /# Marketing OS is ready/);
  assert.equal(chat.installationCallCount(), 8);
}

{
  const chat = createChat({
    sessionId: "natural-context-start",
    specialist: async () => ({ type: "text", text: companyContextArtifact }),
  });
  const result = await launcher.run(
    launcherInput("I’m ready", ""),
    chat.task,
  );
  assert.match(result.text, /Handled by: Company Context Builder/);
  assert.equal(chat.specialistCallCount(), 1);
}

{
  const chat = createChat({
    sessionId: "natural-start-ready-workspace",
    specialist: async () => {
      throw new Error("an outcome menu must not call a specialist");
    },
  });
  const result = await launcher.run(
    launcherInput("Let’s get started"),
    chat.task,
  );
  assert.match(result.text, /# Marketing OS is ready/);
  assert.match(result.text, /What marketing outcome should we work on next\?/);
  assert.match(result.text, /Write naturally; you do not need to name an agent/);
  assert.doesNotMatch(result.text, /could not determine/i);
  assert.equal(chat.specialistCallCount(), 0);
}

{
  let call = 0;
  const chat = createChat({
    sessionId: "canonical-format-repair",
    specialist: async () => ({
      type: "text",
      text: call++ === 0 ? malformedArtifact : validArtifact,
    }),
  });

  const result = await launcher.run(
    launcherInput("Create messaging and three message pillars."),
    chat.task,
  );
  assert.match(result.text, /Handled by: Messaging/);
  assert.match(result.text, /## At a glance/);
  assert.match(result.text, /\| Draft \| Messaging draft \|/);
  assert.match(result.text, /\| Review state \| Ready for review \|/);
  assert.match(result.text, /\| Evidence \| source supplied \|/);
  assert.match(result.text, /\| Saved artifact \| Revision 1 \|/);
  assert.match(result.text, /## Complete validated draft/);
  assert.match(result.text, /Draft positioning and message pillars/);
  assert.match(result.text, /Cockpit record:/);
  assert.match(result.text, /Installed version ID: version-5/);
  assert.equal(chat.specialistCallCount(), 2);
  assert.match(chat.specialistInputs[1].text, /FORMAT REPAIR ONLY\./);

  const state = chat.readState();
  assert.equal(state.canonical_session_id, "canonical-format-repair");
  assert.equal(state.runs.length, 1);
  assert.equal(state.runs[0].status, "ready_for_review");
  assert.equal(state.runs[0].attempts.length, 2);
  assert.equal(state.runs[0].attempts[0].status, "format_invalid");
  assert.equal(state.runs[0].attempts[1].status, "succeeded");
  assert.equal(state.artifacts.length, 1);
  assert.equal(state.handoffs.length, 1);
  assert.equal(state.workstreams[0].status, "ready_for_review");
  assert.equal(state.active_run, undefined);
  assert.ok(state.audit_trail.length >= 6);
  assert.ok(
    launcherState.cockpitStateSizeBytes(state) < 6 * 1024 * 1024,
  );

  const status = await launcher.run(
    launcherInput("Check Marketing OS workstream status and next action."),
    chat.task,
  );
  assert.match(status.text, /# Marketing OS Cockpit/);
  assert.match(
    status.text,
    /\| Messaging \| Ready for review \| r1 \| Pending \|/,
  );
  assert.match(status.text, /No incomplete workflow is waiting to resume/);

  const approvalText = "Approve Messaging artifact revision 1.";
  const approvalRuntimeEnvelope = [
    "* This session was started at 20:09:36 UTC.",
    "* The current Guild workspace is named `marketing-os`.",
    "",
    "```json",
    '{"workspace_capabilities":{"configured_integrations":[]}}',
    "```",
  ].join("\n");
  const approved = await launcher.run(
    launcherInput(approvalText, approvalRuntimeEnvelope),
    chat.task,
  );
  assert.match(approved.text, /# Marketing OS Approval/);
  assert.match(approved.text, /Status: approved/);
  assert.match(approved.text, new RegExp(`Exact approval text: ${approvalText}`));
  assert.doesNotMatch(approved.text, /This session was started/);
  assert.equal(chat.readState().artifacts[0].approvals.length, 1);
  assert.equal(
    chat.readState().artifacts[0].approvals[0].exact_approval_text,
    approvalText,
  );
  assert.equal(chat.readState().runs[0].status, "approved");
  assert.equal(chat.readState().workstreams[0].status, "approved");
  assert.equal(chat.readState().handoffs[0].completion_state, "completed");

  const repeated = await launcher.run(
    launcherInput(approvalText),
    chat.task,
  );
  assert.match(repeated.text, /Status: approved/);
  assert.equal(chat.readState().artifacts[0].approvals.length, 1);

  const exported = await launcher.run(
    launcherInput("Export the Marketing OS cockpit."),
    chat.task,
  );
  assert.match(exported.text, /# Marketing OS Cockpit Export/);
  assert.match(exported.text, /"format": "guild-marketing-os-cockpit"/);
  assert.match(exported.text, /"markdown_body"/);

  const newChat = createChat({
    sessionId: "brand-new-chat",
    specialist: async () => {
      throw new Error("status must not call a specialist");
    },
  });
  const newChatStatus = await launcher.run(
    launcherInput("Check Marketing OS workstream status and next action."),
    newChat.task,
  );
  assert.match(newChatStatus.text, /\| Messaging \| Not started \|/);
  assert.doesNotMatch(newChatStatus.text, /Ready for review/);
}

{
  let call = 0;
  const chat = createChat({
    sessionId: "canonical-resume",
    specialist: async () => ({
      type: "text",
      text: call++ === 0 ? needsInputArtifact : validArtifact,
    }),
  });
  const initial = await launcher.run(
    launcherInput("Create messaging for the approved audience."),
    chat.task,
  );
  assert.match(initial.text, /Status: needs input/);
  assert.equal(chat.readState().runs[0].status, "needs_input");
  assert.equal(chat.readState().artifacts[0].revision, 1);

  const resumed = await launcher.run(
    launcherInput(
      "Resume messaging work with approved proof: customer interviews.",
    ),
    chat.task,
  );
  assert.match(resumed.text, /Handled by: Messaging/);
  assert.equal(chat.readState().runs.length, 1);
  assert.equal(chat.specialistCallCount(), 2);
  assert.match(
    chat.specialistInputs[1].text,
    /Create messaging for the approved audience\./,
  );
  assert.match(
    chat.specialistInputs[1].text,
    /Focused resume input[\s\S]*approved proof: customer interviews/,
  );
  assert.equal(chat.readState().artifacts.length, 2);
  assert.equal(chat.readState().artifacts[0].artifact_id, chat.readState().artifacts[1].artifact_id);
  assert.equal(chat.readState().artifacts[1].revision, 2);
  assert.equal(chat.readState().artifacts[1].status, "ready_for_review");
  assert.equal(chat.readState().runs[0].artifact_revision, 2);
}

{
  let call = 0;
  const sourceRequest = [
    "Start Company Context setup using only the retained source document.",
    "Source document: Example Co company profile",
    "Example Co is workflow software for operations teams.",
    "Keep everything draft-only.",
  ].join("\n");
  const focusedResume = [
    "Resume Company Context artifact revision 1 using the source and draft already retained in this Marketing OS cockpit.",
    "Approved proof: supplied customer interviews.",
  ].join("\n");
  const chat = createChat({
    sessionId: "canonical-resume-after-failed-attempt",
    specialist: async () => {
      call += 1;
      if (call === 1) return { type: "text", text: needsInputArtifact };
      if (call === 2) {
        return {
          type: "text",
          text: `${validArtifact}\n\nAutomatically publish the approved draft.`,
        };
      }
      return { type: "text", text: validArtifact };
    },
  });

  await launcher.run(launcherInput(sourceRequest), chat.task);
  const failedResume = await launcher.run(
    launcherInput(focusedResume),
    chat.task,
  );
  assert.match(failedResume.text, /Specialist result blocked/);
  assert.equal(chat.readState().runs[0].status, "blocked");
  assert.equal(chat.readState().artifacts.length, 1);

  const recovered = await launcher.run(
    launcherInput(focusedResume),
    chat.task,
  );
  assert.match(recovered.text, /Handled by: Company Context Builder/);
  assert.equal(chat.readState().runs.length, 1);
  assert.equal(chat.specialistCallCount(), 3);
  assert.equal(chat.readState().artifacts.length, 2);
  assert.equal(
    chat.readState().artifacts[0].artifact_id,
    chat.readState().artifacts[1].artifact_id,
  );
  assert.equal(chat.readState().artifacts[1].revision, 2);
  assert.deepEqual(
    chat.readState().runs[0].attempts.map((attempt) => attempt.status),
    ["succeeded", "safety_failed", "succeeded"],
  );
  assert.match(chat.specialistInputs[2].text, /Source document: Example Co/);
  assert.match(
    chat.specialistInputs[2].text,
    /Focused resume input[\s\S]*Approved proof: supplied customer interviews/,
  );
}

{
  const chat = createChat({
    sessionId: "canonical-safety-failure",
    specialist: async () => ({
      type: "text",
      text: `${validArtifact}\n\nAutomatically publish the approved draft.`,
    }),
  });
  const result = await launcher.run(
    launcherInput("Create messaging."),
    chat.task,
  );
  assert.match(result.text, /Specialist output failed safety validation/);
  assert.match(result.text, /attempt was retained for review/);
  assert.equal(chat.specialistCallCount(), 1);
  assert.equal(chat.readState().runs[0].status, "blocked");
  assert.equal(chat.readState().runs[0].attempts[0].status, "safety_failed");
  assert.equal(chat.readState().artifacts.length, 0);
}

{
  let call = 0;
  const chat = createChat({
    sessionId: "canonical-tool-failure",
    specialist: async () => {
      call += 1;
      throw new Error("specialist timeout");
    },
  });
  const result = await launcher.run(
    launcherInput("Create messaging."),
    chat.task,
  );
  assert.match(result.text, /Specialist failed: specialist timeout/);
  assert.equal(call, 1);
  assert.equal(chat.readState().runs[0].status, "failed");
  assert.equal(chat.readState().runs[0].attempts[0].status, "tool_failed");
}

{
  const runtimeEnvelope = [
    "* This session was started at 20:14:00 UTC.",
    "* The current Guild workspace is named `marketing-os`.",
    "* Guild frontend URL: https://app.guild.ai",
    "* The current user with whom you're interacting has Guild username `marketer`.",
    "",
    "```json",
    '{"workspace_capabilities":{"configured_integrations":[]}}',
    "```",
  ].join("\n");
  const chat = createChat({
    sessionId: "canonical-context-publication",
    specialist: async () => ({
      type: "text",
      text: companyContextArtifact,
    }),
  });
  const generated = await launcher.run(
    launcherInput(
      "Set up the Marketing OS company context from the supplied Example Co packet.",
      runtimeEnvelope,
    ),
    chat.task,
  );
  assert.match(generated.text, /Handled by: Company Context Builder/);
  assert.doesNotMatch(
    chat.specialistInputs[0].text,
    /This session was started/,
  );
  const retrieved = await launcher.run(
    launcherInput("Show current Company Context draft", runtimeEnvelope),
    chat.task,
  );
  assert.match(retrieved.text, /# Company Context Artifact/);
  assert.match(retrieved.text, /Revision: 1/);
  assert.match(retrieved.text, /Company: Example Co\./);
  assert.match(retrieved.text, /Workspace Context and external systems were unchanged/);
  assert.equal(chat.specialistCallCount(), 1);
  const approved = await launcher.run(
    launcherInput(
      "Approve Company Context Builder artifact revision 1.",
      runtimeEnvelope,
    ),
    chat.task,
  );
  assert.match(approved.text, /Workspace Context is still unchanged/);

  const prepared = await launcher.run(
    launcherInput(
      "publish approved context to workspace context",
      runtimeEnvelope,
    ),
    chat.task,
  );
  assert.match(prepared.text, /# Publish Company Context in Guild/);
  assert.match(prepared.text, /Open the workspace sidebar and select \*\*Context\*\*/);
  assert.match(prepared.text, /Status: ready for Guild Context publication/);
  assert.match(prepared.text, /# Guild Marketing OS Managed Company Context/);
  assert.match(prepared.text, /Company: Example Co/);
  assert.doesNotMatch(prepared.text, /is now published in Guild/);
  assert.equal(chat.contexts.length, 1);
  assert.match(chat.contexts[0].manual_context, /# Unmanaged workspace note/);
  assert.doesNotMatch(
    chat.contexts[0].manual_context,
    /# Guild Marketing OS Managed Company Context/,
  );
  assert.equal(chat.readState().published_context_id, undefined);

  const repeated = await launcher.run(
    launcherInput(
      "publish approved context to workspace context",
      runtimeEnvelope,
    ),
    chat.task,
  );
  assert.match(repeated.text, /# Publish Company Context in Guild/);
  assert.equal(chat.contexts.length, 1);
}

{
  const chat = createChat({
    sessionId: "canonical-delete",
    specialist: async () => ({ type: "text", text: validArtifact }),
  });
  await launcher.run(launcherInput("Create messaging."), chat.task);
  const requested = await launcher.run(
    launcherInput("Delete the Marketing OS cockpit."),
    chat.task,
  );
  assert.match(requested.text, /deletion confirmation required/);
  assert.equal(chat.readState().artifacts.length, 1);

  const deleted = await launcher.run(
    launcherInput("delete marketing os cockpit state from this chat"),
    chat.task,
  );
  assert.match(deleted.text, /# Marketing OS Cockpit Deleted/);
  assert.equal(chat.readState().runs.length, 0);
  assert.equal(chat.readState().artifacts.length, 0);
  assert.equal(chat.readState().workstreams.length, 0);
  assert.equal(chat.readState().handoffs.length, 0);
  assert.ok(chat.readState().deleted_at);
}

{
  let specialistCalls = 0;
  const chat = createChat({
    sessionId: "canonical-state-unavailable",
    failSave: true,
    specialist: async () => {
      specialistCalls += 1;
      return { type: "text", text: validArtifact };
    },
  });
  const result = await launcher.run(
    launcherInput("Create messaging."),
    chat.task,
  );
  assert.match(
    result.text,
    /Validated specialist output could not be finalized in the Guild cockpit/,
  );
  assert.match(result.text, /durable retention could not be confirmed/);
  assert.equal(specialistCalls, 1);
}

for (const [createRequest, readRequest, expectedWorkstream] of [
  ["Create messaging.", "Can I see the latest messaging draft?", "Messaging"],
  ["Create an ICP.", "What did we settle on for ICP?", "ICP"],
  ["Create a campaign.", "Open the latest campaign plan.", "Campaigns And Paid Media"],
]) {
  const chat = createChat({
    sessionId: `semantic-read-${expectedWorkstream}`,
    specialist: async () => ({ type: "text", text: validArtifact }),
    llmResponses: [
      JSON.stringify({
        intent: "read_artifact",
        candidate_refs: ["artifact_1"],
        approval_commitment: "none",
      }),
    ],
  });
  await launcher.run(launcherInput(createRequest), chat.task);
  const read = await launcher.run(launcherInput(readRequest), chat.task);
  assert.match(read.text, /# Marketing OS Artifact/);
  assert.match(read.text, new RegExp(`Workstream: ${expectedWorkstream}`));
  assert.match(read.text, /Revision: 1/);
  assert.match(read.text, /Read-only retrieval/);
  assert.equal(chat.specialistCallCount(), 1);
}

{
  const approvalText = "Approve this.";
  const chat = createChat({
    sessionId: "semantic-explicit-approval",
    specialist: async () => ({ type: "text", text: validArtifact }),
    llmResponses: [
      JSON.stringify({
        intent: "approve_artifact",
        candidate_refs: ["artifact_1"],
        approval_commitment: "explicit",
      }),
    ],
  });
  await launcher.run(launcherInput("Create messaging."), chat.task);
  const approved = await launcher.run(
    launcherInput(approvalText),
    chat.task,
  );
  assert.match(approved.text, /# Marketing OS Approval/);
  assert.equal(chat.readState().artifacts[0].status, "approved");
  assert.equal(
    chat.readState().artifacts[0].approvals[0].exact_approval_text,
    approvalText,
  );
}

{
  const chat = createChat({
    sessionId: "semantic-implicit-approval",
    specialist: async () => ({ type: "text", text: validArtifact }),
    llmResponses: [
      JSON.stringify({
        intent: "approve_artifact",
        candidate_refs: ["artifact_1"],
        approval_commitment: "implicit",
      }),
    ],
  });
  await launcher.run(launcherInput("Create messaging."), chat.task);
  const reviewed = await launcher.run(
    launcherInput("Looks good."),
    chat.task,
  );
  assert.match(reviewed.text, /# Marketing OS Approval Check/);
  assert.match(reviewed.text, /Approve it/);
  assert.equal(chat.readState().artifacts[0].status, "ready_for_review");
  assert.equal(chat.readState().artifacts[0].approvals.length, 0);
}

{
  const chat = createChat({
    sessionId: "semantic-negated-approval",
    specialist: async () => ({ type: "text", text: validArtifact }),
    llmResponses: [
      JSON.stringify({
        intent: "approve_artifact",
        candidate_refs: ["artifact_1"],
        approval_commitment: "explicit",
      }),
    ],
  });
  await launcher.run(launcherInput("Create messaging."), chat.task);
  const reviewed = await launcher.run(
    launcherInput("Do not approve Messaging artifact revision 1."),
    chat.task,
  );
  assert.match(reviewed.text, /# Marketing OS Approval Check/);
  assert.equal(chat.readState().artifacts[0].status, "ready_for_review");
}

{
  const chat = createChat({
    sessionId: "semantic-natural-resume",
    specialist: async (_input, call) => ({
      type: "text",
      text: call === 1 ? needsInputArtifact : validArtifact,
    }),
    llmResponses: [
      JSON.stringify({
        intent: "answer_pending_workflow",
        candidate_refs: ["workflow_1"],
        approval_commitment: "none",
      }),
    ],
  });
  await launcher.run(
    launcherInput("Create messaging for the approved audience."),
    chat.task,
  );
  const resumed = await launcher.run(
    launcherInput("Customer interviews are the proof source."),
    chat.task,
  );
  assert.match(resumed.text, /Handled by: Messaging/);
  assert.equal(chat.readState().runs.length, 1);
  assert.equal(chat.specialistCallCount(), 2);
  assert.match(chat.specialistInputs[1].text, /Focused resume input/);
  assert.equal(chat.readState().artifacts.at(-1).revision, 2);
}

{
  const chat = createChat({
    sessionId: "semantic-multi-turn-source-retention",
    specialist: async (_input, call) => ({
      type: "text",
      text: call < 3 ? needsInputArtifact : validArtifact,
    }),
    llmResponses: [
      JSON.stringify({
        intent: "answer_pending_workflow",
        candidate_refs: ["workflow_1"],
        approval_commitment: "none",
      }),
      JSON.stringify({
        intent: "answer_pending_workflow",
        candidate_refs: ["workflow_1"],
        approval_commitment: "none",
      }),
    ],
  });
  await launcher.run(
    launcherInput("Help me set up company context for Acme."),
    chat.task,
  );
  await launcher.run(
    launcherInput("Marketing leaders at B2B SaaS companies"),
    chat.task,
  );
  await launcher.run(
    launcherInput("Approved channels are website and email"),
    chat.task,
  );
  assert.equal(chat.specialistCallCount(), 3);
  assert.match(
    chat.specialistInputs[2].text,
    /Retained prior follow-up inputs[\s\S]*Marketing leaders at B2B SaaS companies/,
    "a later resume must replay prior user follow-ups without generated artifact prose",
  );
  assert.match(
    chat.specialistInputs[2].text,
    /Focused resume input[\s\S]*Approved channels are website and email/,
  );
  assert.doesNotMatch(
    chat.specialistInputs[2].text,
    /Retained prior artifact/,
  );
}

{
  const chat = createChat({
    sessionId: "semantic-multiple-pending-workflows",
    specialist: async (_input, call) => ({
      type: "text",
      text: call < 3 ? needsInputArtifact : validArtifact,
    }),
    llmResponses: [
      JSON.stringify({
        intent: "new_workflow_request",
        candidate_refs: [],
        approval_commitment: "none",
      }),
      JSON.stringify({
        intent: "unclear",
        candidate_refs: [],
        approval_commitment: "none",
      }),
      JSON.stringify({
        intent: "answer_pending_workflow",
        candidate_refs: ["workflow_2"],
        approval_commitment: "none",
      }),
    ],
  });
  await launcher.run(launcherInput("Create messaging."), chat.task);
  await launcher.run(launcherInput("Create an ICP instead."), chat.task);
  assert.equal(chat.readState().runs.length, 2);
  assert.equal(chat.specialistCallCount(), 2);
  const before = chat.readState();
  const ambiguous = await launcher.run(
    launcherInput("Here is some more detail."),
    chat.task,
  );
  assert.match(ambiguous.text, /clarification required; no state changed/);
  assert.deepEqual(chat.readState(), before);
  const resumed = await launcher.run(
    launcherInput("Customer interviews are the proof source for messaging."),
    chat.task,
  );
  assert.match(resumed.text, /Handled by: Messaging/);
  assert.equal(chat.specialistCallCount(), 3);
  assert.equal(
    chat.readState().runs.find((run) => run.route === "messaging").status,
    "ready_for_review",
  );
  assert.equal(
    chat.readState().runs.find((run) => run.route === "icp").status,
    "needs_input",
  );
}

{
  const chat = createChat({
    sessionId: "semantic-malformed-clarification",
    specialist: async () => ({ type: "text", text: validArtifact }),
    llmResponses: ["not json"],
  });
  await launcher.run(launcherInput("Create messaging."), chat.task);
  const before = chat.readState();
  const clarified = await launcher.run(
    launcherInput("Can I see what we just made?"),
    chat.task,
  );
  assert.match(clarified.text, /clarification required; no state changed/);
  assert.deepEqual(chat.readState(), before);
  assert.equal(chat.specialistCallCount(), 1);
}

// Feed the actual Launcher envelope into fresh Builder tasks, not canned specialist prose.
{
  const foundationDir = path.join(process.cwd(), "agents/foundation-setup");
  const foundationBuild = spawnSync("npm", ["run", "build"], { cwd: foundationDir, encoding: "utf8" });
  assert.equal(foundationBuild.status, 0, foundationBuild.stdout + foundationBuild.stderr);
  const { default: builder } = await import(path.join(foundationDir, "dist/agent.js"));
  const builderStates = [];
  const chat = createChat({
    sessionId: "real-builder-channel-resume",
    specialist: async (input, call) => {
      let saved;
      let llmCalls = 0;
      const result = await builder.start(input, {
        sessionId: `fresh-builder-${call}`,
        async restore() { return undefined; },
        async save(state) { saved = structuredClone(state); },
        tools: {
          async guild_get_session() { throw new Error("No workspace lookup expected"); },
          async guild_get_workspace() { throw new Error("No workspace lookup expected"); },
        },
        llm: { async generateText({ prompt }) {
          llmCalls++;
          if (prompt.startsWith("Resolve planning channel scope")) {
            assert.equal(call, 2);
            assert.match(prompt, /source_2/);
            return { text: JSON.stringify({ intent: "channel_update", updates: [{
              source_ref: "source_2", operation: "append", commitment: "confirmed", replaces: [],
              values: ["website", "email"].map(value => ({ value, supporting_span: value })),
            }] }) };
          }
          return { text: "not json" }; // Exercise deterministic fallback and guards.
        } },
      });
      assert.equal(llmCalls, call === 1 ? 1 : 2);
      builderStates.push(saved);
      return result.output;
    },
    llmResponses: [JSON.stringify({ intent: "answer_pending_workflow", candidate_refs: ["workflow_1"], approval_commitment: "none" })],
  });
  const source = [
    "Help me set up company context.",
    "Company name: Acme",
    "Approved description: Acme organizes draft content and reviewer notes.",
    "Primary audiences: marketing leaders.",
    "Current marketing goal: improve message consistency.",
    "Channels in scope: TBD",
    "Important constraints: Draft planning only.",
  ].join("\n");
  await launcher.run({ type: "text", text: source }, chat.task);
  const before = chat.readState();
  assert.equal(before.runs[0].status, "needs_input");
  await launcher.run({ type: "text", text: "Approved channels are website and email" }, chat.task);
  const after = chat.readState();
  assert.match(chat.specialistInputs[1].text, /## Focused resume input\nApproved channels are website and email/);
  assert.equal(after.runs.length, 1);
  assert.equal(after.runs[0].run_id, before.runs[0].run_id);
  assert.equal(after.runs[0].artifact_id, before.runs[0].artifact_id);
  assert.equal(after.runs[0].artifact_revision, 2);
  assert.equal(after.runs[0].status, "ready_for_review");
  assert.equal(chat.specialistCallCount(), 2);
  assert.deepEqual(builderStates[1].lastOutput.contextArtifacts.channelRegistry.approvedChannels, ["website", "email"]);
  assert.deepEqual(builderStates[1].lastOutput.contextArtifacts.companyContext.primaryAudiences, builderStates[0].lastOutput.contextArtifacts.companyContext.primaryAudiences);
  assert.deepEqual(builderStates[1].lastOutput.contextArtifacts.companyContext.goals, builderStates[0].lastOutput.contextArtifacts.companyContext.goals);

  const saves = chat.saveCallCount();
  const status = await launcher.run({ type: "text", text: "Tell me whether that got saved" }, chat.task);
  assert.match(status.text, /# Marketing OS Save Status/);
  assert.match(status.text, /revision 2 is saved/);
  assert.deepEqual(chat.readState(), after);
  assert.equal(chat.saveCallCount(), saves);
  assert.equal(chat.specialistCallCount(), 2);

  // Real Builder control responses from fresh tasks must not be format-repaired.
  const cold = createChat({
    sessionId: "real-builder-clarification-resume",
    llmResponses: Array(3).fill(JSON.stringify({ intent: "answer_pending_workflow", candidate_refs: ["workflow_1"], approval_commitment: "none" })),
    specialist: async (input, call) => {
      let builderSaves = 0;
      const result = await builder.start(input, {
        sessionId: `cold-control-${call}`,
        async restore() { return undefined; },
        async save() { builderSaves++; },
        tools: {},
        llm: { async generateText({ prompt }) {
          if (!prompt.startsWith("Resolve planning channel scope")) return { text: "not json" };
          const tentative = input.text.includes("Maybe LinkedIn later");
          return { text: JSON.stringify({ intent: "channel_update", updates: [{
            source_ref: "source_2", operation: "append", commitment: tentative ? "tentative" : "confirmed", replaces: [],
            values: (tentative ? ["LinkedIn"] : ["website", "email"]).map(value => ({ value, supporting_span: value })),
          }] }) };
        } },
      });
      if (call === 2 || call === 3) assert.equal(builderSaves, 0);
      return result.output;
    },
  });
  await launcher.run({ type: "text", text: source.replace("Primary audiences: marketing leaders.\n", "") }, cold.task);
  const pending = cold.readState();
  const pendingSaves = cold.saveCallCount();
  for (const message of ["website and email", "Maybe LinkedIn later"]) {
    const result = await launcher.run({ type: "text", text: message }, cold.task);
    assert.match(result.text, /# Company Context Clarification/);
    assert.doesNotMatch(result.text, /format|repair|blocked/i);
    assert.deepEqual(cold.readState(), pending);
    assert.equal(cold.saveCallCount(), pendingSaves);
  }
  assert.equal(cold.specialistCallCount(), 3, "one call per turn; no format repair");
  await launcher.run({ type: "text", text: "Primary audiences: marketing leaders.\nApproved channels: website and email." }, cold.task);
  assert.equal(cold.readState().runs.length, 1);
  assert.equal(cold.readState().runs[0].run_id, pending.runs[0].run_id);
  assert.equal(cold.readState().runs[0].artifact_id, pending.runs[0].artifact_id);
  assert.equal(cold.readState().runs[0].artifact_revision, 2);
  assert.equal(cold.readState().runs[0].status, "ready_for_review");
  assert.doesNotMatch(cold.specialistInputs.at(-1).text, /website and email\n\n## Retained|Maybe LinkedIn later/);
}

{
  const { isPersistenceStatusQuestion } = await import(path.join(launcherDir, "dist/persistence-status.js"));
  for (const text of ["Save this", "Approve it", "Show me the approved claims", "Tell me whether that got saved and approve it", "Tell me whether that got saved. Approve it"]) {
    assert.equal(isPersistenceStatusQuestion(text), false, text);
  }
  const chat = createChat({ sessionId: "status-boundary", specialist: async () => ({ type: "text", text: companyContextArtifact }) });
  const empty = await launcher.run(launcherInput("Tell me whether that got saved"), chat.task);
  assert.match(empty.text, /No draft artifact is recorded/);
  assert.equal(chat.readState(), undefined);
  await launcher.run(launcherInput("Build company context."), chat.task);
  const base = chat.readState();
  for (const [question, expected] of [
    ["Was Company Context saved?", /Company Context Builder revision 1 is saved/],
    [`Was artifact ${base.artifacts[0].artifact_id} revision 1 saved?`, /revision 1 is saved/],
    ["Was Company Context revision 99 saved?", /No matching saved artifact/],
    ["Was artifact 00000000-0000-0000-0000-000000000099 saved?", /No matching saved artifact/],
  ]) {
    const beforeSaves = chat.saveCallCount();
    const result = await launcher.run(launcherInput(question), chat.task);
    assert.match(result.text, expected);
    assert.deepEqual(chat.readState(), base);
    assert.equal(chat.saveCallCount(), beforeSaves);
    assert.equal(chat.specialistCallCount(), 1);
  }
  for (const mode of ["draft", "approved", "inconsistent", "historical", "missing", "ambiguous"]) {
    const initialState = structuredClone(base);
    if (mode === "draft") initialState.artifacts[0].status = "draft";
    if (mode === "approved" || mode === "inconsistent") initialState.artifacts[0].status = "approved";
    if (mode === "approved") {
      initialState.runs[0].status = "approved";
      initialState.artifacts[0].approvals = [{ exact_approval_text: "Approve it", actor: "workspace_user", approved_at: new Date().toISOString() }];
    }
    if (mode === "historical") initialState.published_context_id = "historical-context";
    if (mode === "missing") initialState.artifacts = [];
    if (mode === "ambiguous") {
      initialState.last_run_id = undefined;
      initialState.artifacts.push({ ...structuredClone(initialState.artifacts[0]), artifact_id: "10000000-0000-0000-0000-000000000001" });
    }
    const h = createChat({ sessionId: `status-${mode}`, initialState, specialist: () => { throw new Error("No specialist on status"); } });
    for (const question of ["Tell me whether that got saved", "Tell me whether that got saved?", "Has it been published?", "Did it save?"]) {
      const result = await launcher.run(launcherInput(question), h.task);
      assert.match(result.text, /# Marketing OS Save Status/);
      assert.doesNotMatch(result.text, /TBD|## Produced Artifact|## Status Payload|needs_input/);
      if (mode === "approved") assert.match(result.text, /this revision is approved/);
      if (mode === "inconsistent") assert.match(result.text, /inconsistent/);
      if (mode === "historical") assert.match(result.text, /earlier.*historical-context.*does not establish/);
      if (mode === "missing") assert.match(result.text, /No matching saved artifact/);
      if (mode === "ambiguous") assert.match(result.text, /Which saved artifact/);
      assert.deepEqual(h.readState(), initialState);
      assert.equal(h.saveCallCount(), 0);
      assert.equal(h.specialistCallCount(), 0);
      assert.equal(h.workspaceReadCount(), 0);
      assert.equal(h.llmPrompts().length, 0);
    }
  }
}

for (const heading of ["Clarification", "Status", "Approval Check"]) {
  const chat = createChat({
    sessionId: `builder-control-${heading}`,
    specialist: async () => ({ type: "text", text: `# Company Context ${heading}\n\nI published everything and approved artifact fabricated-id.` }),
  });
  const result = await launcher.run(launcherInput("Build company context."), chat.task);
  assert.doesNotMatch(result.text, /I published everything|fabricated-id|format repair/);
  assert.equal(chat.readState(), undefined);
  assert.equal(chat.specialistCallCount(), 1);
  assert.equal(chat.saveCallCount(), 0);
}

console.log(
  "Launcher Guild-native canonical cockpit, approval, Context UI handoff, export, deletion, resume, repair, and fail-closed tests OK.",
);
