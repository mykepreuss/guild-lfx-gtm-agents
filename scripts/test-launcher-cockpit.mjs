#!/usr/bin/env node

import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { MemoryMarketingOsStateAdapter } from "../services/guild-marketing-os-state/memory-adapter.mjs";

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

const [{ default: launcher }, launcherCore] = await Promise.all([
  import(path.join(launcherDir, "dist/agent.js")),
  import(path.join(launcherDir, "dist/launcher-core.js")),
]);

const tenant = {
  organization_id: "organization-test",
  workspace_id: "workspace-test",
};
const managedContext = [
  "<!-- guild-marketing-os-context:start -->",
  "Status: published",
  "## Workspace Context Brief",
  "Company: Example Co.",
  "Approved proof: supplied customer interviews only.",
  "Blocked actions: publishing, scheduling, spend, and CRM mutation.",
  "<!-- guild-marketing-os-context:end -->",
].join("\n");
const contextRevision =
  launcherCore.readContextSnapshot(managedContext).contextRevision;

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
Return the completed messaging artifact to Marketing OS for review.
`.trim();

const malformedArtifact = `
## Consumed Context
Published context revision consumed.

## Produced Artifact
Draft positioning.
`.trim();

function installedAgents() {
  return launcherCore.suiteInstallOrder.map((entry, index) => ({
    package_name: `michaelpreuss~${entry.packageName}`,
    version_id: `version-${index + 1}`,
  }));
}

function createStateTools(adapter) {
  return {
    async marketing_os_run_create(request) {
      return { data: await adapter.createWorkflowRun(tenant, request) };
    },
    async marketing_os_run_get({ runId }) {
      return { data: await adapter.getWorkflowRun(tenant, runId) };
    },
    async marketing_os_runs_list() {
      return { data: await adapter.listWorkflowRuns(tenant) };
    },
    async marketing_os_attempt_record({ runId, ...request }) {
      return {
        data: await adapter.recordWorkflowAttempt(tenant, {
          ...request,
          run_id: runId,
        }),
      };
    },
    async marketing_os_artifact_store(request) {
      return { data: await adapter.storeArtifact(tenant, request) };
    },
    async marketing_os_artifact_get({ artifactId, revision }) {
      return {
        data: await adapter.getArtifact(tenant, artifactId, revision),
      };
    },
    async marketing_os_artifact_approve({ artifactId, ...request }) {
      return {
        data: await adapter.approveArtifact(tenant, {
          ...request,
          artifact_id: artifactId,
          actor: "user-test",
        }),
      };
    },
    async marketing_os_handoff_create(request) {
      return { data: await adapter.createHandoff(tenant, request) };
    },
    async marketing_os_handoff_update({ handoffId, ...request }) {
      return {
        data: await adapter.updateHandoff(tenant, {
          ...request,
          handoff_id: handoffId,
        }),
      };
    },
    async marketing_os_run_update({ runId, ...request }) {
      return {
        data: await adapter.updateWorkflowRun(tenant, {
          ...request,
          run_id: runId,
        }),
      };
    },
    async marketing_os_workstream_read({ specialist }) {
      return {
        data: (await adapter.readWorkstream(tenant, specialist)) ?? null,
      };
    },
    async marketing_os_workstream_update(request) {
      return { data: await adapter.updateWorkstream(tenant, request) };
    },
  };
}

function createTask({
  adapter,
  sessionId,
  specialist,
  failRunCreate = false,
  failAttemptRecord = false,
  failApprovalRunUpdate = false,
}) {
  let state;
  const specialistInputs = [];
  const stateTools = createStateTools(adapter);
  if (failRunCreate) {
    stateTools.marketing_os_run_create = async () => {
      throw new Error("state service unavailable");
    };
  }
  if (failAttemptRecord) {
    stateTools.marketing_os_attempt_record = async () => {
      throw new Error("attempt ledger unavailable");
    };
  }
  if (failApprovalRunUpdate) {
    const updateRun = stateTools.marketing_os_run_update;
    stateTools.marketing_os_run_update = async (request) => {
      if (request.status === "approved") {
        throw new Error("run approval synchronization unavailable");
      }
      return updateRun(request);
    };
  }
  return {
    task: {
      sessionId,
      tools: {
        ...stateTools,
        async guild_get_task_workspace_agents() {
          return installedAgents();
        },
        async guild_get_agent_version() {
          return { version_number: "1.2.0" };
        },
        async guild_agent_install_request() {
          throw new Error("not expected");
        },
        async marketing_os_company_context_builder(input) {
          return specialist(input);
        },
        async marketing_os_market_signal(input) {
          return specialist(input);
        },
        async marketing_os_icp(input) {
          return specialist(input);
        },
        async marketing_os_audience_segmentation(input) {
          return specialist(input);
        },
        async marketing_os_messaging(input) {
          specialistInputs.push(input);
          return specialist(input);
        },
        async marketing_os_branding_pitch_deck(input) {
          return specialist(input);
        },
        async marketing_os_social_monitoring_content(input) {
          return specialist(input);
        },
        async marketing_os_campaigns_paid_media(input) {
          return specialist(input);
        },
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
        state = structuredClone(value);
      },
    },
    specialistInputs,
    readState() {
      return state;
    },
  };
}

function launcherInput(request) {
  return {
    type: "text",
    text: `${managedContext}\n\n${request}`,
  };
}

{
  const adapter = new MemoryMarketingOsStateAdapter();
  let specialistCall = 0;
  const harness = createTask({
    adapter,
    sessionId: "session-format-repair",
    specialist: async () => ({
      type: "text",
      text: specialistCall++ === 0 ? malformedArtifact : validArtifact,
    }),
  });

  const result = await launcher.run(
    launcherInput("Create messaging and three message pillars."),
    harness.task,
  );
  assert.match(result.text, /Handled by: Messaging/);
  assert.match(result.text, /Cockpit record:/);
  assert.match(result.text, /Specialist version: 1\.2\.0/);
  assert.equal(specialistCall, 2);
  assert.match(
    harness.specialistInputs[1].text,
    /FORMAT REPAIR ONLY\./,
    "the only retry must be an explicit format repair",
  );

  const [run] = await adapter.listWorkflowRuns(tenant);
  assert.equal(run.status, "ready_for_review");
  assert.equal(run.attempts.length, 2);
  assert.equal(run.attempts[0].status, "format_invalid");
  assert.equal(run.attempts[1].status, "succeeded");
  assert.equal(run.package_version, "1.2.0");
  assert.ok(run.artifact_id);
  assert.ok(run.handoff_id);
  assert.equal(harness.readState().last_run_id, run.run_id);
  assert.equal(harness.readState().active_run, undefined);

  const cockpit = createTask({
    adapter,
    sessionId: "session-cockpit",
    specialist: async () => {
      throw new Error("cockpit must not call a specialist");
    },
  });
  const status = await launcher.run(
    launcherInput("Check Marketing OS workstream status and next action."),
    cockpit.task,
  );
  assert.match(status.text, /# Marketing OS Cockpit/);
  assert.match(
    status.text,
    /\| Messaging \| ready_for_review \| r1 \| pending \|/,
  );
  assert.match(status.text, /No incomplete workflow is waiting to resume/);
  assert.match(status.text, /No external action was performed/);

  const approval = createTask({
    adapter,
    sessionId: "session-approval",
    specialist: async () => {
      throw new Error("approval must not call a specialist");
    },
  });
  const approvalText = "Approve Messaging artifact revision 1.";
  const approved = await launcher.run(
    launcherInput(approvalText),
    approval.task,
  );
  assert.match(approved.text, /# Marketing OS Approval/);
  assert.match(approved.text, /Status: approved/);
  assert.match(approved.text, new RegExp(`Exact approval text: ${approvalText}`));
  assert.match(approved.text, /No publishing, scheduling, spend, CRM mutation/);

  const approvedRun = await adapter.getWorkflowRun(tenant, run.run_id);
  assert.equal(approvedRun.status, "approved");
  const approvedArtifact = await adapter.getArtifact(
    tenant,
    run.artifact_id,
    run.artifact_revision,
  );
  assert.equal(approvedArtifact.status, "approved");
  assert.equal(approvedArtifact.approvals.length, 1);
  assert.equal(
    approvedArtifact.approvals[0].exact_approval_text,
    approvalText,
  );
  const approvedWorkstream = await adapter.readWorkstream(
    tenant,
    "Messaging",
  );
  assert.equal(approvedWorkstream.status, "approved");
  const exported = await adapter.exportWorkspace(tenant);
  assert.equal(
    exported.handoffs.find(
      (handoff) => handoff.handoff_id === run.handoff_id,
    ).completion_state,
    "completed",
  );

  const repeated = await launcher.run(
    launcherInput(approvalText),
    approval.task,
  );
  assert.match(repeated.text, /Status: approved/);
  assert.equal(
    (
      await adapter.getArtifact(
        tenant,
        run.artifact_id,
        run.artifact_revision,
      )
    ).approvals.length,
    1,
    "repeating the exact approval must remain idempotent",
  );

  const approvedStatus = await launcher.run(
    launcherInput("Check Marketing OS workstream status and next action."),
    cockpit.task,
  );
  assert.match(
    approvedStatus.text,
    /\| Messaging \| approved \| r1 \| approved \|/,
  );
}

{
  const adapter = new MemoryMarketingOsStateAdapter();
  const generation = createTask({
    adapter,
    sessionId: "session-partial-approval-generation",
    specialist: async () => ({ type: "text", text: validArtifact }),
  });
  await launcher.run(
    launcherInput("Create messaging for partial approval recovery."),
    generation.task,
  );
  const [run] = await adapter.listWorkflowRuns(tenant);
  const approvalText = "Approve Messaging artifact revision 1.";
  const failingApproval = createTask({
    adapter,
    sessionId: "session-partial-approval-failure",
    failApprovalRunUpdate: true,
    specialist: async () => {
      throw new Error("approval must not call a specialist");
    },
  });
  const partial = await launcher.run(
    launcherInput(approvalText),
    failingApproval.task,
  );
  assert.match(partial.text, /was approved, but the related cockpit records/);
  assert.match(
    partial.text,
    /Status: approval recorded; cockpit synchronization blocked/,
  );
  assert.equal(
    (
      await adapter.getArtifact(
        tenant,
        run.artifact_id,
        run.artifact_revision,
      )
    ).status,
    "approved",
  );
  assert.equal(
    (await adapter.getWorkflowRun(tenant, run.run_id)).status,
    "ready_for_review",
  );

  const recovery = createTask({
    adapter,
    sessionId: "session-partial-approval-recovery",
    specialist: async () => {
      throw new Error("approval recovery must not call a specialist");
    },
  });
  const recovered = await launcher.run(
    launcherInput(approvalText),
    recovery.task,
  );
  assert.match(recovered.text, /Status: approved/);
  assert.match(
    recovered.text,
    new RegExp(`Exact approval text: ${approvalText}`),
  );
  assert.equal(
    (await adapter.getWorkflowRun(tenant, run.run_id)).status,
    "approved",
  );
  assert.equal(
    (
      await adapter.getArtifact(
        tenant,
        run.artifact_id,
        run.artifact_revision,
      )
    ).approvals.length,
    1,
  );
}

{
  const adapter = new MemoryMarketingOsStateAdapter();
  for (const [index, request] of [
    "Create messaging for audience A.",
    "Create messaging for audience B.",
  ].entries()) {
    const harness = createTask({
      adapter,
      sessionId: `session-ambiguous-approval-${index + 1}`,
      specialist: async () => ({ type: "text", text: validArtifact }),
    });
    const result = await launcher.run(launcherInput(request), harness.task);
    assert.match(result.text, /Status: ready for review/);
  }

  const approval = createTask({
    adapter,
    sessionId: "session-ambiguous-approval",
    specialist: async () => {
      throw new Error("approval must not call a specialist");
    },
  });
  const ambiguous = await launcher.run(
    launcherInput("Approve Messaging artifact revision 1."),
    approval.task,
  );
  assert.match(ambiguous.text, /matches more than one durable artifact/);
  assert.match(ambiguous.text, /approval target is ambiguous/);

  const runs = await adapter.listWorkflowRuns(tenant);
  const selected = runs[0];
  const exact = await launcher.run(
    launcherInput(
      `Approve Messaging artifact ${selected.artifact_id} revision ${selected.artifact_revision}.`,
    ),
    approval.task,
  );
  assert.match(exact.text, /Status: approved/);
  assert.equal(
    (await adapter.getWorkflowRun(tenant, selected.run_id)).status,
    "approved",
  );
  assert.equal(
    (await adapter.getWorkflowRun(tenant, runs[1].run_id)).status,
    "ready_for_review",
  );
}

{
  const adapter = new MemoryMarketingOsStateAdapter();
  const seededRun = await adapter.createWorkflowRun(tenant, {
    idempotency_key: "seed-resume-run",
    run_id: "resume-run-001",
    route: "messaging",
    specialist: "Messaging",
    context_revision: contextRevision,
    package_name: "guild-marketing-os-messaging",
    package_version: "1.2.0",
    input_envelope: {
      user_request: "Create messaging for the approved audience.",
      context_revision: contextRevision,
    },
    status: "running",
    blockers: [],
    next_action: "Repair the retained format.",
  });
  await adapter.recordWorkflowAttempt(tenant, {
    idempotency_key: "seed-resume-attempt",
    run_id: seededRun.run_id,
    attempt_number: 1,
    attempt_kind: "initial",
    package_name: seededRun.package_name,
    package_version: seededRun.package_version,
    context_revision: contextRevision,
    input_envelope: { prompt: "Create messaging." },
    output_body: malformedArtifact,
    validation_errors: ["Missing heading: ## Approval Gate"],
    status: "format_invalid",
  });

  let specialistCalls = 0;
  const harness = createTask({
    adapter,
    sessionId: "different-session",
    specialist: async (input) => {
      specialistCalls += 1;
      assert.match(input.text, /FORMAT REPAIR ONLY\./);
      assert.match(input.text, /Prior attempt:/);
      return { type: "text", text: validArtifact };
    },
  });
  const result = await launcher.run(
    launcherInput("Resume messaging work."),
    harness.task,
  );
  assert.match(result.text, /Workflow run: resume-run-001/);
  assert.equal(specialistCalls, 1);
  const resumed = await adapter.getWorkflowRun(tenant, seededRun.run_id);
  assert.equal(resumed.status, "ready_for_review");
  assert.equal(resumed.attempts.length, 2);
  assert.equal(
    (await adapter.listWorkflowRuns(tenant)).length,
    1,
    "resume must not create a duplicate run",
  );
}

{
  const adapter = new MemoryMarketingOsStateAdapter();
  let specialistCalls = 0;
  const harness = createTask({
    adapter,
    sessionId: "session-state-unavailable",
    failRunCreate: true,
    specialist: async () => {
      specialistCalls += 1;
      return { type: "text", text: validArtifact };
    },
  });
  const result = await launcher.run(
    launcherInput("Create messaging."),
    harness.task,
  );
  assert.match(result.text, /Durable cockpit initialization failed/);
  assert.match(result.text, /No specialist was started/);
  assert.equal(specialistCalls, 0);
  assert.deepEqual(await adapter.listWorkflowRuns(tenant), []);
}

{
  const adapter = new MemoryMarketingOsStateAdapter();
  const harness = createTask({
    adapter,
    sessionId: "session-attempt-ledger-unavailable",
    failAttemptRecord: true,
    specialist: async () => ({ type: "text", text: validArtifact }),
  });
  const result = await launcher.run(
    launcherInput("Create messaging."),
    harness.task,
  );
  assert.match(result.text, /durable attempt record failed/);
  assert.match(result.text, /durable retention could not be confirmed/);
  assert.doesNotMatch(result.text, /attempt was retained for review/);
  const [run] = await adapter.listWorkflowRuns(tenant);
  assert.equal(run.status, "running");
  assert.equal(run.attempts.length, 0);
  const exported = await adapter.exportWorkspace(tenant);
  assert.equal(exported.artifacts.length, 0);
}

{
  const adapter = new MemoryMarketingOsStateAdapter();
  let specialistCalls = 0;
  const harness = createTask({
    adapter,
    sessionId: "session-safety-failure",
    specialist: async () => {
      specialistCalls += 1;
      return {
        type: "text",
        text: `${validArtifact}\n\nAutomatically publish the approved draft.`,
      };
    },
  });
  const result = await launcher.run(
    launcherInput("Create messaging."),
    harness.task,
  );
  assert.match(result.text, /Specialist output failed safety validation/);
  assert.match(result.text, /attempt was retained for review/);
  assert.equal(specialistCalls, 1);
  const [run] = await adapter.listWorkflowRuns(tenant);
  assert.equal(run.status, "blocked");
  assert.equal(run.attempts.length, 1);
  assert.equal(run.attempts[0].status, "safety_failed");
  const workstream = await adapter.readWorkstream(tenant, "Messaging");
  assert.equal(workstream.status, "blocked");
}

console.log(
  "Launcher durable cockpit, approval, repair, resume, fail-closed, and safety tests OK.",
);
