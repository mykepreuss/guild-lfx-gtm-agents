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
}) {
  let state = initialState;
  let specialistCalls = 0;
  let installationCalls = 0;
  const installationAgentIds = [];
  const specialistInputs = [];
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
      async guild_get_task_workspace_agents() {
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
      async guild_get_session() {
        return {
          id: sessionId,
          workspace: { id: "workspace-test" },
          context_id: contexts.find((item) => item.status === "PUBLISHED")?.id,
        };
      },
      async guild_get_workspace() {
        return {
          id: "workspace-test",
          full_name: "test/marketing-os",
          context: {
            id: contexts.find((item) => item.status === "PUBLISHED")?.id,
            compiled: managedContext,
          },
        };
      },
      async guild_workspace_contexts_list() {
        return { items: [...contexts] };
      },
      async guild_workspace_context_create(request) {
        const created = {
          id: `context-${contexts.length + 1}`,
          status: request.status,
          manual_context: request.context,
          summary: request.summary,
        };
        contexts.unshift(created);
        return created;
      },
      async guild_workspace_context_publish(request) {
        const context = contexts.find(
          (candidate) => candidate.id === request.context_id,
        );
        if (!context) throw new Error("context draft not found");
        context.status = request.status;
        return context;
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
      async generateText() {
        return { text: "guide" };
      },
    },
    async restore() {
      return state;
    },
    async save(value) {
      if (failSave) throw new Error("Guild state unavailable");
      state = structuredClone(value);
    },
  };

  return {
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
  assert.match(result.text, /8 missing capability packages were installed/);
  assert.match(
    result.text,
    /Each installation required its own explicit approval/,
  );
  assert.doesNotMatch(result.text, /Continue onboarding to verify/);
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
  assert.match(resumed.text, /6 missing capability packages were installed/);
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
    ),
    chat.task,
  );
  assert.match(generated.text, /Handled by: Company Context Builder/);
  const approved = await launcher.run(
    launcherInput(
      "Approve Company Context Builder artifact revision 1.",
    ),
    chat.task,
  );
  assert.match(approved.text, /Workspace Context is still unchanged/);

  const published = await launcher.run(
    launcherInput("publish approved context to workspace context"),
    chat.task,
  );
  assert.match(published.text, /is now published in Guild/);
  assert.match(published.text, /Status: published/);
  assert.equal(chat.contexts.length, 2);
  assert.match(chat.contexts[0].manual_context, /# Unmanaged workspace note/);
  assert.match(
    chat.contexts[0].manual_context,
    /# Guild Marketing OS Managed Company Context/,
  );
  assert.match(chat.contexts[0].manual_context, /Company: Example Co/);
  assert.equal(chat.readState().published_context_id, "context-2");

  const repeated = await launcher.run(
    launcherInput("publish approved context to workspace context"),
    chat.task,
  );
  assert.match(repeated.text, /was already published in Guild/);
  assert.equal(chat.contexts.length, 2);
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

console.log(
  "Launcher Guild-native canonical cockpit, approval, publication, export, deletion, resume, repair, and fail-closed tests OK.",
);
