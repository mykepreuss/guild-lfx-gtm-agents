"use agent";

import {
  agent,
  guildAgentTool,
  guildTools,
  pick,
  progressLogNotifyEvent,
  type Task,
  userInterfaceTools,
} from "@guildai/agents-sdk";
import { z } from "zod";
import {
  classifyRoute,
  deterministicRoute,
  extractApprovedHipaaConstraint,
  extractArtifactApprovalText,
  extractSpecialistText,
  inputSchema,
  installedSuiteAgents,
  onlyFormatErrors,
  outputSchema,
  parseArtifactApprovalRequest,
  readContextSnapshot,
  removeCompiledWorkspaceContext,
  renderBlocked,
  renderDelegatedResult,
  renderGuide,
  renderOnboardingStatus,
  renderSpecialistBlocked,
  routeConfig,
  safeError,
  specialistInput,
  specialistInputSchema,
  specialistOutputSchema,
  specialistResultStatus,
  suiteInstallOrder,
  validateSpecialistOutput,
  type DelegatedRoute,
} from "./launcher-core.js";
import {
  allocateRunIdentity,
  artifactResponseSchema,
  completeRunState,
  createSerializableSessionCockpit,
  evidenceModeFromArtifact,
  handoffRationale,
  handoffResponseSchema,
  launcherAgentStateSchema,
  readLauncherAgentState,
  reduceSessionCockpitOperation,
  renderArtifactApprovalReceipt,
  renderCockpitReceipt,
  renderCockpitStatus,
  resumeRequested,
  workflowRunResponseSchema,
  workstreamResponseSchema,
  type SerializableSessionCockpit,
  type WorkflowRun,
  type WorkstreamRecord,
} from "./launcher-state.js";
import { suitePackageBindings } from "./suite-binding.js";

export {
  classifyRoute,
  deterministicRoute,
  extractApprovedHipaaConstraint,
  extractArtifactApprovalText,
  parseArtifactApprovalRequest,
  removeCompiledWorkspaceContext,
  renderDelegatedResult,
  renderOnboardingStatus,
  specialistInput,
  specialistResultStatus,
  validateSpecialistOutput,
} from "./launcher-core.js";

const tools = {
  ...userInterfaceTools,
  ...pick(guildTools, [
    "guild_agent_install_request",
    "guild_get_task_workspace_agents",
  ]),
  marketing_os_company_context_builder: guildAgentTool({
    inputSchema: specialistInputSchema,
    outputSchema: specialistOutputSchema,
    calls: suitePackageBindings.company_context.qualifiedName,
  }),
  marketing_os_market_signal: guildAgentTool({
    inputSchema: specialistInputSchema,
    outputSchema: specialistOutputSchema,
    calls: suitePackageBindings.market_signal.qualifiedName,
  }),
  marketing_os_icp: guildAgentTool({
    inputSchema: specialistInputSchema,
    outputSchema: specialistOutputSchema,
    calls: suitePackageBindings.icp.qualifiedName,
  }),
  marketing_os_audience_segmentation: guildAgentTool({
    inputSchema: specialistInputSchema,
    outputSchema: specialistOutputSchema,
    calls: suitePackageBindings.audience_segmentation.qualifiedName,
  }),
  marketing_os_messaging: guildAgentTool({
    inputSchema: specialistInputSchema,
    outputSchema: specialistOutputSchema,
    calls: suitePackageBindings.messaging.qualifiedName,
  }),
  marketing_os_branding_pitch_deck: guildAgentTool({
    inputSchema: specialistInputSchema,
    outputSchema: specialistOutputSchema,
    calls: suitePackageBindings.branding_pitch_deck.qualifiedName,
  }),
  marketing_os_social_monitoring_content: guildAgentTool({
    inputSchema: specialistInputSchema,
    outputSchema: specialistOutputSchema,
    calls: suitePackageBindings.social_monitoring_content.qualifiedName,
  }),
  marketing_os_campaigns_paid_media: guildAgentTool({
    inputSchema: specialistInputSchema,
    outputSchema: specialistOutputSchema,
    calls: suitePackageBindings.campaigns_paid_media.qualifiedName,
  }),
};

type Tools = typeof tools;
type LauncherTask = Task<Tools, z.infer<typeof launcherAgentStateSchema>>;

const exactContextPublishPhrase =
  "publish approved context to workspace context";
const exactCockpitDeletePhrase =
  "delete marketing os cockpit state from this chat";

async function run(
  input: z.infer<typeof inputSchema>,
  task: LauncherTask,
): Promise<z.infer<typeof outputSchema>> {
  const context = readContextSnapshot(input.text);
  const userText = removeCompiledWorkspaceContext(input.text, context.compiled);
  const initialState = readLauncherAgentState(await task.restore(), task.sessionId);
  const cockpit = createSerializableSessionCockpit(initialState);

  if (isExactContextPublishConfirmation(userText)) {
    const output = await publishApprovedCompanyContext(
      userText,
      cockpit,
    );
    await task.save(cockpit.state);
    return output;
  }
  if (isCompanyContextArtifactReadRequest(userText)) {
    return {
      type: "text",
      text: renderCompanyContextArtifactRead(userText, cockpit),
    };
  }
  if (isCockpitExportRequest(userText)) {
    return {
      type: "text",
      text: renderCockpitExport(cockpit),
    };
  }
  if (isExactCockpitDeleteConfirmation(userText)) {
    const deletedSessionId =
      cockpit.state.canonical_session_id ?? task.sessionId;
    applyCockpitOperation(cockpit, "deleteCockpit");
    await task.save(cockpit.state);
    return {
      type: "text",
      text: [
        "# Marketing OS Cockpit Deleted",
        "",
        `Structured Marketing OS state was deleted from canonical Chat ${deletedSessionId}.`,
        "The deletion removed workflow runs, specialist attempts, artifact bodies, approvals, handoffs, workstreams, and their local index from this Chat state.",
        "Guild workspace context and Guild session history were not deleted.",
        "",
        "Status: cockpit state deleted",
        "No publishing, scheduling, spend, CRM mutation, or other external marketing action occurred.",
      ].join("\n"),
    };
  }
  if (isCockpitDeleteRequest(userText)) {
    return {
      type: "text",
      text: renderGuide(
        `This removes the structured cockpit state from this canonical Chat. It does not delete Guild session history or published Workspace Context. To confirm, reply exactly: \`${exactCockpitDeletePhrase}\`.`,
        "deletion confirmation required",
      ),
    };
  }

  const workspaceAgents = await task.tools.guild_get_task_workspace_agents({});
  const installed = installedSuiteAgents(workspaceAgents);
  const classification = await classifyRoute(userText, task, {
    suiteReady: installed.length === suiteInstallOrder.length,
    contextReady: context.ready,
  });

  if (classification["route"] === "blocked") {
    return {
      type: "text",
      text: renderBlocked(
        "V1 is draft-only. Publishing, scheduling, spend, CRM mutation, credential setup, legal approval, recursive delegation, and arbitrary-agent invocation are not supported. The only supported Guild product mutation is approved Workspace Context publication after the exact confirmation phrase.",
      ),
    };
  }

  if (classification["route"] === "guide") {
    return {
      type: "text",
      text:
        classification.routingReason === "state_aware_start_fallback"
          ? renderReadyForOutcome()
          : renderGuide(
              "I could not determine one safe specialist workflow. Name the desired outcome: company context, market signal, ICP, audience segmentation, messaging, brand/deck, social/content, or campaigns/paid media.",
            ),
    };
  }

  if (classification["route"] === "onboarding") {
    const installedDuringOnboarding = [...installed];
    const approvedInstallations: string[] = [];

    for (const missing of suiteInstallOrder.filter(
      (entry) =>
        !installed.some((record) => record.packageName === entry.packageName),
    )) {
      try {
        const position = suiteInstallOrder.findIndex(
          (entry) => entry.packageName === missing.packageName,
        ) + 1;
        await notifyProgress(
          task,
          `Installing specialist ${position} of ${suiteInstallOrder.length}: ${missing.displayName}…`,
        );
        const installation = await task.tools.guild_agent_install_request({
          agent_id: missing.agentId,
        });
        approvedInstallations.push(missing.displayName);
        installedDuringOnboarding.push({
          packageName: missing.packageName,
          versionId: installation.id,
        });
      } catch {
        return {
          type: "text",
          text: [
            "# Marketing OS Onboarding",
            "",
            `${missing.displayName} is still unavailable. Its installation request was denied, suspended, or failed, and onboarding remains resumable.`,
            "",
            approvedInstallations.length > 0
              ? `Approved earlier in this run: ${approvedInstallations.join(", ")}.`
              : "No installation was approved in this run.",
            "Onboarding stopped immediately. No later package was requested.",
            "",
            "Send `Continue Marketing OS onboarding` to resume from this package.",
          ].join("\n"),
        };
      }
    }

    await notifyProgress(
      task,
      "Marketing OS setup verified: all eight specialists are available.",
    );

    return {
      type: "text",
      text: [
        renderOnboardingStatus(installedDuringOnboarding),
        "",
        approvedInstallations.length > 0
          ? `${approvedInstallations.length} Marketing OS specialist${approvedInstallations.length === 1 ? " was" : "s were"} installed through separate Guild approval requests.`
          : "No specialist installation was needed.",
        "Each installation required its own explicit approval.",
        "",
        "Keep using this Chat so Marketing OS can remember your drafts, approvals, progress, and next steps.",
      ].join("\n"),
    };
  }

  if (classification["route"] === "cockpit") {
    const approval = parseArtifactApprovalRequest(userText);
    if (approval.requested) {
      const output = approveCockpitArtifact(
        extractArtifactApprovalText(userText),
        approval,
        cockpit,
      );
      await task.save(cockpit.state);
      return output;
    }
    return {
      type: "text",
      text: renderCockpitStatus(
        cockpit.state.workstreams,
        cockpit.state.runs,
      ),
    };
  }

  const route = classification["route"] as DelegatedRoute;
  const config = routeConfig[route];
  const installedAgent = installed.find(
    (record) => record.packageName === config.packageName,
  );

  if (route !== "company_context" && !context.ready) {
    return {
      type: "text",
      text: renderGuide(
        "Approved published Marketing OS context is not ready. Use Company Context Builder first, approve its exact artifact revision in this Chat, then confirm publication with the exact required phrase.",
        "blocked on company context",
      ),
    };
  }

  if (!installedAgent) {
    return {
      type: "text",
      text: renderGuide(
        `${config.displayName} is required but unavailable. Installation remains blocked and resumable; an administrator must approve that suite package before this route can run.`,
        "blocked on installation",
      ),
    };
  }

  const packageVersion = installedAgent.versionId;

  let currentRun: WorkflowRun | undefined;
  let idempotencyPrefix = "";
  let requestText = userText;
  let resumingNeedsInput = false;

  if (resumeRequested(userText)) {
    currentRun = findResumableRun(cockpit.state.runs, route);
    if (currentRun) {
      resumingNeedsInput =
        currentRun.status === "needs_input" ||
        (["blocked", "failed"].includes(currentRun.status) &&
          hasSuccessfulArtifactCheckpoint(currentRun));
      idempotencyPrefix = `launcher-${currentRun.run_id}`;
      const originalRequest = currentRun.input_envelope.user_request;
      if (typeof originalRequest === "string" && originalRequest.trim()) {
        requestText = [
          originalRequest.trim(),
          "",
          "## Focused resume input",
          userText.trim(),
        ].join("\n");
      }
    }
  }

  if (!currentRun) {
    const allocation = allocateRunIdentity(
      cockpit.state,
      task.sessionId,
      route,
      requestText,
      context.contextRevision,
    );
    idempotencyPrefix = allocation["idempotencyPrefix"];
    try {
      applyCockpitOperation(cockpit, "setState", allocation.state);
    } catch (error) {
      return {
        type: "text",
        text: renderBlocked(
          `Canonical cockpit initialization failed: ${safeError(error)}. No specialist was started.`,
        ),
      };
    }

    if (allocation.reused) {
      try {
        currentRun = workflowRunResponseSchema.parse(
          applyCockpitOperation(cockpit, "runGet", {
            runId: allocation.runId,
          }),
        ).data;
      } catch {
        currentRun = undefined;
      }
    }

    if (!currentRun) {
      try {
        currentRun = workflowRunResponseSchema.parse(
          applyCockpitOperation(cockpit, "runCreate", {
            idempotency_key: `${idempotencyPrefix}-create`,
            run_id: allocation.runId,
            route,
            specialist: config.displayName,
            context_revision: context.contextRevision,
            package_name: config.packageName,
            package_version: packageVersion,
            input_envelope: {
              user_request: requestText,
              session_id: task.sessionId,
              context_revision: context.contextRevision,
              installed_version_id: installedAgent.versionId,
              routing_reason: classification.routingReason,
              classifier_attempts: classification.classifierAttempts,
            },
            status: "running",
            blockers: [],
            next_action: `Run ${config.displayName}.`,
          }),
        ).data;
      } catch (error) {
        return {
          type: "text",
          text: renderBlocked(
            `Canonical cockpit initialization failed: ${safeError(error)}. No specialist was started.`,
          ),
        };
      }
    }
  }

  if (!currentRun) {
    return {
      type: "text",
      text: renderBlocked(
        "Canonical cockpit initialization returned no workflow run. No specialist was started.",
      ),
    };
  }

  if (currentRun.status === "ready_for_review") {
    const completedAttempt = [...currentRun.attempts]
      .reverse()
      .find((attempt) => attempt.status === "succeeded");
    const completedText = completedAttempt
      ? completedAttempt.output_body
      : undefined;
    if (
      completedText &&
      currentRun.artifact_id &&
      currentRun.artifact_revision
    ) {
      completeCockpitRun(cockpit, currentRun.run_id);
      await task.save(cockpit.state);
      return {
        type: "text",
        text: [
          renderDelegatedResult(config.displayName, completedText, {
            artifactRevision: currentRun.artifact_revision,
            status: "ready_for_review",
            nextAction: currentRun.next_action ?? undefined,
          }),
          "",
          renderCockpitReceipt({
            artifactId: currentRun.artifact_id,
            artifactRevision: currentRun.artifact_revision,
            runId: currentRun.run_id,
            packageVersion: currentRun.package_version,
            contextRevision: currentRun.context_revision ?? "unavailable",
          }),
        ].join("\n"),
      };
    }
  }

  if (
    currentRun.status === "approved" ||
    (["blocked", "failed"].includes(currentRun.status) &&
      !resumingNeedsInput)
  ) {
    completeCockpitRun(cockpit, currentRun.run_id);
    await task.save(cockpit.state);
    return {
      type: "text",
      text: renderSpecialistBlocked(
        currentRun.error_summary ??
          currentRun.blockers[0] ??
          `Workflow is ${currentRun.status}.`,
        currentRun.run_id,
      ),
    };
  }

  if (
    currentRun.status === "needs_input" ||
    (["blocked", "failed"].includes(currentRun.status) &&
      hasSuccessfulArtifactCheckpoint(currentRun))
  ) {
    try {
      currentRun = workflowRunResponseSchema.parse(
        applyCockpitOperation(cockpit, "runUpdate", {
          runId: currentRun.run_id,
          idempotency_key: `${idempotencyPrefix}-resume-r${currentRun.revision}`,
          expected_revision: currentRun.revision,
          status: "running",
          package_version: packageVersion,
          blockers: [],
          next_action: `Resume ${config.displayName}.`,
        }),
      ).data;
    } catch (error) {
      return {
        type: "text",
        text: renderBlocked(
          `Could not reopen the canonical workflow: ${safeError(error)}. No new specialist attempt was started.`,
        ),
      };
    }
  }

  let workstream: WorkstreamRecord | undefined;
  try {
    workstream =
      workstreamResponseSchema.parse(
        applyCockpitOperation(cockpit, "workstreamRead", {
          specialist: config.displayName,
        }),
      ).data ?? undefined;
    const updatedWorkstream = workstreamResponseSchema.parse(
      applyCockpitOperation(cockpit, "workstreamUpdate", {
        specialist: config.displayName,
        idempotency_key: `${idempotencyPrefix}-workstream-running-${
          workstream ? workstream.revision : 0
        }`,
        expected_revision: workstream ? workstream.revision : 0,
        status: "running",
        blockers: [],
        next_action: `Complete ${config.displayName} artifact.`,
      }),
    ).data;
    if (!updatedWorkstream) throw new Error("No workstream record was returned.");
    workstream = updatedWorkstream;
  } catch (error) {
    return {
      type: "text",
      text: renderBlocked(
        `Canonical workstream initialization failed: ${safeError(error)}. No new specialist attempt was started.`,
      ),
    };
  }

  const existingCompletedAttempt = resumingNeedsInput
    ? undefined
    : [...currentRun.attempts]
        .reverse()
        .find((attempt) => attempt.status === "succeeded");
  let completedText = existingCompletedAttempt
    ? existingCompletedAttempt.output_body
    : undefined;
  let nextAttemptNumber = currentRun.attempts.length + 1;
  let nextAttemptKind: "initial" | "format_repair" | "resume" =
    resumingNeedsInput
      ? "resume"
      : nextAttemptNumber === 1
        ? "initial"
        : "format_repair";
  let finalAttemptCount = currentRun.attempts.length;
  const expectedHipaaConstraint = route !== "company_context" &&
    /\bHIPAA\b|\bPHI\b/i.test(requestText)
    ? extractApprovedHipaaConstraint(context.compiled)
    : undefined;
  let delegatedInput = specialistInput(
    requestText,
    context.contextRevision,
    route,
    expectedHipaaConstraint,
  );

  const previousAttempt = currentRun.attempts.at(-1);
  if (!completedText && previousAttempt && !resumingNeedsInput) {
    if (
      previousAttempt.status === "format_invalid" &&
      previousAttempt.attempt_number === 1 &&
      previousAttempt.output_body
    ) {
      delegatedInput = formatRepairInput(
        previousAttempt.output_body,
        previousAttempt.validation_errors,
        context.contextRevision,
        route,
        expectedHipaaConstraint,
      );
    } else {
      const reason =
        previousAttempt.error_message ??
        (previousAttempt.validation_errors.join("; ") ||
          "The prior specialist attempt cannot be retried automatically.");
      if (previousAttempt.status === "safety_failed") {
        finishBlockedRun(
          cockpit,
          currentRun,
          workstream,
          idempotencyPrefix,
          reason,
        );
      } else {
        finishFailedRun(
          cockpit,
          currentRun,
          workstream,
          idempotencyPrefix,
          reason,
        );
      }
      completeCockpitRun(cockpit, currentRun.run_id);
      await task.save(cockpit.state);
      return {
        type: "text",
        text: renderSpecialistBlocked(reason, currentRun.run_id),
      };
    }
  }

  while (!completedText) {
    let attemptOutput: z.infer<typeof specialistOutputSchema>;
    try {
      switch (route) {
        case "company_context":
          attemptOutput =
            await task.tools.marketing_os_company_context_builder(
              delegatedInput,
            );
          break;
        case "market_signal":
          attemptOutput =
            await task.tools.marketing_os_market_signal(delegatedInput);
          break;
        case "icp":
          attemptOutput = await task.tools.marketing_os_icp(delegatedInput);
          break;
        case "audience_segmentation":
          attemptOutput =
            await task.tools.marketing_os_audience_segmentation(
              delegatedInput,
            );
          break;
        case "messaging":
          attemptOutput =
            await task.tools.marketing_os_messaging(delegatedInput);
          break;
        case "branding_pitch_deck":
          attemptOutput =
            await task.tools.marketing_os_branding_pitch_deck(
              delegatedInput,
            );
          break;
        case "social_monitoring_content":
          attemptOutput =
            await task.tools.marketing_os_social_monitoring_content(
              delegatedInput,
            );
          break;
        case "campaigns_paid_media":
          attemptOutput =
            await task.tools.marketing_os_campaigns_paid_media(
              delegatedInput,
            );
          break;
      }
    } catch (error) {
      const message = safeError(error);
      try {
        applyCockpitOperation(cockpit, "attemptRecord", {
          runId: currentRun.run_id,
          idempotency_key: `${idempotencyPrefix}-attempt-${nextAttemptNumber}`,
          attempt_number: nextAttemptNumber,
          attempt_kind: nextAttemptKind,
          package_name: currentRun.package_name,
          package_version: currentRun.package_version,
          context_revision: currentRun.context_revision ?? undefined,
          input_envelope: { prompt: delegatedInput.text },
          validation_errors: [],
          status: "tool_failed",
          error_code: "specialist_tool_failed",
          error_message: message,
        });
        finishFailedRun(
          cockpit,
          currentRun,
          workstream,
          idempotencyPrefix,
          `Specialist failed: ${message}`,
        );
        completeCockpitRun(cockpit, currentRun.run_id);
        await task.save(cockpit.state);
      } catch (stateError) {
        return {
          type: "text",
          text: renderSpecialistBlocked(
            `Specialist failed and Guild cockpit retention also failed: ${safeError(stateError)}`,
            currentRun.run_id,
            false,
          ),
        };
      }
      return {
        type: "text",
        text: renderSpecialistBlocked(
          `Specialist failed: ${message}`,
          currentRun.run_id,
        ),
      };
    }

    const attemptText = extractSpecialistText(attemptOutput);
    const errors = attemptText
      ? validateSpecialistOutput(attemptText, {
          allowContextPublicationPhrase: route === "company_context",
          allowContextEvidenceReconciliation: route === "company_context",
          expectedHipaaConstraint,
        })
      : ["Empty or unsupported specialist output."];
    const attemptStatus =
      errors.length === 0
        ? "succeeded"
        : onlyFormatErrors(errors)
          ? "format_invalid"
          : "safety_failed";

    try {
      applyCockpitOperation(cockpit, "attemptRecord", {
        runId: currentRun.run_id,
        idempotency_key: `${idempotencyPrefix}-attempt-${nextAttemptNumber}`,
        attempt_number: nextAttemptNumber,
        attempt_kind: nextAttemptKind,
        package_name: currentRun.package_name,
        package_version: currentRun.package_version,
        context_revision: currentRun.context_revision ?? undefined,
        input_envelope: { prompt: delegatedInput.text },
        output_body: attemptText || undefined,
        validation_errors: errors,
        status: attemptStatus,
      });
      finalAttemptCount = Math.max(finalAttemptCount, nextAttemptNumber);
    } catch (error) {
      return {
        type: "text",
        text: renderSpecialistBlocked(
          `The specialist returned a result, but its Guild cockpit attempt record failed: ${safeError(error)}. The result was not imported into the cockpit.`,
          currentRun.run_id,
          false,
        ),
      };
    }

    if (attemptStatus === "succeeded") {
      completedText = attemptText;
      break;
    }

    if (attemptStatus === "safety_failed") {
      const reason = `Specialist output failed safety validation: ${errors.join("; ")}`;
      finishBlockedRun(
        cockpit,
        currentRun,
        workstream,
        idempotencyPrefix,
        reason,
      );
      completeCockpitRun(cockpit, currentRun.run_id);
      await task.save(cockpit.state);
      return {
        type: "text",
        text: renderSpecialistBlocked(reason, currentRun.run_id),
      };
    }

    if (nextAttemptKind === "format_repair") {
      const reason = `Specialist format repair failed validation: ${errors.join("; ")}`;
      finishFailedRun(
        cockpit,
        currentRun,
        workstream,
        idempotencyPrefix,
        reason,
      );
      completeCockpitRun(cockpit, currentRun.run_id);
      await task.save(cockpit.state);
      return {
        type: "text",
        text: renderSpecialistBlocked(reason, currentRun.run_id),
      };
    }

    delegatedInput = formatRepairInput(
      attemptText,
      errors,
      context.contextRevision,
      route,
      expectedHipaaConstraint,
    );
    nextAttemptNumber += 1;
    nextAttemptKind = "format_repair";
  }

  if (!completedText) {
    return {
      type: "text",
      text: renderSpecialistBlocked(
        "No validated specialist output was available for Guild cockpit storage.",
        currentRun.run_id,
      ),
    };
  }

  try {
    const resultStatus =
      specialistResultStatus(completedText) ?? "ready_for_review";
    const needsInput = resultStatus === "needs_input";
    const blockers = needsInput
      ? ["The specialist requires the missing inputs listed in the saved draft."]
      : [];
    const artifact = artifactResponseSchema.parse(
      applyCockpitOperation(cockpit, "artifactStore", {
        idempotency_key: `${idempotencyPrefix}-artifact-a${nextAttemptNumber}`,
        artifact_id: currentRun.artifact_id ?? undefined,
        artifact_type: route,
        markdown_body: completedText,
        consumed_context_revision: context.contextRevision,
        consumed_source_revisions: [],
        evidence: [{ mode: evidenceModeFromArtifact(completedText) }],
        status: needsInput ? "draft" : "ready_for_review",
        safety: {
          action_mode: "draft_only",
          external_mutation_requested: false,
          blocked_actions: [
            "publishing",
            "scheduling",
            "spend",
            "CRM mutation",
            "credential setup",
            "legal approval",
          ],
          unsupported_claims: [],
          evidence_gaps: [],
        },
        metadata: {
          route,
          specialist: config.displayName,
          package_name: config.packageName,
          package_version: currentRun.package_version,
          installed_version_id: installedAgent.versionId,
          workflow_run_id: currentRun.run_id,
          session_id: task.sessionId,
          attempt_count: finalAttemptCount,
        },
      }),
    ).data;
    const nextAction = needsInput
      ? `Provide the missing core inputs listed in ${config.displayName} artifact revision ${artifact.revision}, then resume this workstream. Optional enhancements can be added later.`
      : route === "company_context"
        ? `Approve this useful baseline now by sending: \`Approve Company Context Builder artifact revision ${artifact.revision}.\` You can add or revise context later.`
        : `Review ${config.displayName} artifact revision ${artifact.revision}.`;
    const handoff = handoffResponseSchema.parse(
      applyCockpitOperation(cockpit, "handoffCreate", {
        idempotency_key: `${idempotencyPrefix}-handoff-r${artifact.revision}`,
        source_agent: config.displayName,
        target_agent: "Marketing OS Launcher",
        artifact_references: [
          {
            artifact_id: artifact.artifact_id,
            revision: artifact.revision,
          },
        ],
        context_revision: context.contextRevision,
        rationale: handoffRationale(completedText),
        completion_state: "pending",
      }),
    ).data;
    const completedRun = workflowRunResponseSchema.parse(
      applyCockpitOperation(cockpit, "runUpdate", {
        runId: currentRun.run_id,
        idempotency_key: `${idempotencyPrefix}-${
          needsInput ? "needs-input" : "ready"
        }-r${artifact.revision}`,
        expected_revision: currentRun.revision,
        status: needsInput ? "needs_input" : "ready_for_review",
        artifact_id: artifact.artifact_id,
        artifact_revision: artifact.revision,
        handoff_id: handoff.handoff_id,
        blockers,
        next_action: nextAction,
      }),
    ).data;
    applyCockpitOperation(cockpit, "workstreamUpdate", {
      specialist: config.displayName,
      idempotency_key: `${idempotencyPrefix}-workstream-${
        needsInput ? "needs-input" : "ready"
      }-r${artifact.revision}`,
      expected_revision: workstream.revision,
      status: needsInput ? "needs_input" : "ready_for_review",
      latest_artifact_id: artifact.artifact_id,
      latest_artifact_revision: artifact.revision,
      blockers,
      next_action: nextAction,
      handoff_id: handoff.handoff_id,
    });
    completeCockpitRun(cockpit, currentRun.run_id);
    await task.save(cockpit.state);
    return {
      type: "text",
      text: [
        renderDelegatedResult(config.displayName, completedText, {
          artifactRevision: artifact.revision,
          status: needsInput ? "needs_input" : "ready_for_review",
          nextAction,
        }),
        "",
        needsInput
          ? "The complete draft is saved in this cockpit and marked Needs input. Add the focused missing inputs listed above, then resume this workstream."
          : "The complete draft is saved and ready for review.",
        "",
        renderCockpitReceipt({
          artifactId: artifact.artifact_id,
          artifactRevision: artifact.revision,
          runId: completedRun.run_id,
          packageVersion: completedRun.package_version,
          contextRevision: completedRun.context_revision ?? "unavailable",
        }),
      ].join("\n"),
    };
  } catch (error) {
    const reason = `Validated specialist output could not be finalized in the Guild cockpit: ${safeError(error)}`;
    let failureRetained = false;
    try {
      finishFailedRun(
        cockpit,
        currentRun,
        workstream,
        idempotencyPrefix,
        reason,
      );
      completeCockpitRun(cockpit, currentRun.run_id);
      await task.save(cockpit.state);
      failureRetained = true;
    } catch {
      // Preserve the original cockpit failure in the user-visible result.
    }
    return {
      type: "text",
      text: renderSpecialistBlocked(
        reason,
        currentRun.run_id,
        failureRetained,
      ),
    };
  }
}

async function notifyProgress(task: LauncherTask, message: string): Promise<void> {
  try {
    await task.tools.ui_notify(progressLogNotifyEvent(message));
  } catch {
    // Progress feedback must never block or change the onboarding result.
  }
}

function renderReadyForOutcome(): string {
  return [
    "# Marketing OS is ready",
    "",
    "The specialist suite and Company Context are available. What marketing outcome should we work on next?",
    "",
    "- Assess market or competitor signals.",
    "- Define an ICP or audience segments.",
    "- Develop positioning and messaging.",
    "- Create a presentation or pitch deck.",
    "- Draft a content plan or integrated campaign.",
    "",
    "Write naturally; you do not need to name an agent.",
    "",
    "Status: ready for a marketing outcome",
    "No specialist work or external action was started.",
  ].join("\n");
}

function approveCockpitArtifact(
  exactApprovalText: string,
  approval: ReturnType<typeof parseArtifactApprovalRequest>,
  cockpit: SerializableSessionCockpit,
): z.infer<typeof outputSchema> {
  if (!approval.revision) {
    return {
      type: "text",
      text: renderGuide(
        "Name the exact positive artifact revision to approve, using the revision shown in the Launcher receipt.",
        "approval target required",
      ),
    };
  }
  if (!approval.route && !approval["artifactId"]) {
    return {
      type: "text",
      text: renderGuide(
        "Name the specialist workstream or exact artifact ID together with the revision. Example: Approve Messaging artifact revision 1.",
        "approval target required",
      ),
    };
  }

  const candidates = cockpit.state.runs.filter(
    (candidate) =>
      ["ready_for_review", "approved"].includes(candidate.status) &&
      candidate.artifact_id &&
      candidate.artifact_revision === approval.revision &&
      (!approval.route || candidate.route === approval.route) &&
      (!approval["artifactId"] ||
        candidate.artifact_id === approval["artifactId"]),
  );
  if (candidates.length === 0) {
    return {
      type: "text",
      text: renderGuide(
        "No review-ready or approved workflow in this canonical Chat matches that exact artifact target. Open cockpit status and use the artifact ID and revision from its Launcher receipt.",
        "approval target not found",
      ),
    };
  }
  if (candidates.length > 1) {
    return {
      type: "text",
      text: renderGuide(
        `That target matches more than one artifact (${candidates
          .map((candidate) => candidate.artifact_id)
          .join(", ")}). Repeat the approval with one exact artifact ID and revision.`,
        "approval target is ambiguous",
      ),
    };
  }

  const target = candidates[0]!;
  if (
    !target.artifact_id ||
    !target.artifact_revision ||
    !target.handoff_id
  ) {
    return {
      type: "text",
      text: renderBlocked(
        "The workflow is missing its artifact or handoff reference. No approval was recorded.",
      ),
    };
  }

  const artifactId = target.artifact_id;
  const artifactRevision = target.artifact_revision;
  const idempotencyPrefix =
    `launcher-${target.run_id}-approval-r${artifactRevision}`;
  let artifactApproved = false;
  let recordedApprovalText = exactApprovalText;

  try {
    let artifact = artifactResponseSchema.parse(
      applyCockpitOperation(cockpit, "artifactGet", {
        artifactId,
        revision: artifactRevision,
      }),
    ).data;
    if (!["ready_for_review", "approved"].includes(artifact.status)) {
      return {
        type: "text",
        text: renderGuide(
          `Artifact ${artifactId} revision ${artifactRevision} is ${artifact.status}; only a ready-for-review artifact can be approved.`,
          "artifact is not review ready",
        ),
      };
    }

    const workstream =
      workstreamResponseSchema.parse(
        applyCockpitOperation(cockpit, "workstreamRead", {
          specialist: target.specialist,
        }),
      ).data ?? undefined;

    if (artifact.status === "ready_for_review") {
      artifact = artifactResponseSchema.parse(
        applyCockpitOperation(cockpit, "artifactApprove", {
          artifactId,
          idempotency_key: `${idempotencyPrefix}-artifact`,
          revision: artifactRevision,
          expected_revision: artifactRevision,
          approval_text: exactApprovalText,
        }),
      ).data;
    }
    if (artifact.status !== "approved") {
      throw new Error("Artifact approval did not return approved state.");
    }
    artifactApproved = true;
    const storedApproval = artifact.approvals.at(-1);
    recordedApprovalText = storedApproval
      ? storedApproval.exact_approval_text
      : exactApprovalText;

    if (target.status !== "approved") {
      applyCockpitOperation(cockpit, "runUpdate", {
        runId: target.run_id,
        idempotency_key: `${idempotencyPrefix}-run`,
        expected_revision: target.revision,
        status: "approved",
        artifact_id: artifactId,
        artifact_revision: artifactRevision,
        handoff_id: target.handoff_id,
        blockers: [],
        next_action:
          target.route === "company_context"
            ? `Reply exactly \`${exactContextPublishPhrase}\` to publish the approved compact brief.`
            : "Use the approved draft artifact in a later review-only workflow.",
      });
    }

    const handoff = cockpit.state.handoffs.find(
        (candidate) => candidate.handoff_id === target.handoff_id,
      );
    if (handoff && handoff.completion_state !== "completed") {
      applyCockpitOperation(cockpit, "handoffUpdate", {
        handoffId: target.handoff_id,
        idempotency_key: `${idempotencyPrefix}-handoff`,
        expected_revision: handoff.revision,
        completion_state: "completed",
      });
    }

    if (
      workstream &&
      workstream.latest_artifact_id === artifactId &&
      workstream.latest_artifact_revision === artifactRevision &&
      workstream.status !== "approved"
    ) {
      applyCockpitOperation(cockpit, "workstreamUpdate", {
        specialist: target.specialist,
        idempotency_key: `${idempotencyPrefix}-workstream`,
        expected_revision: workstream.revision,
        status: "approved",
        latest_artifact_id: artifactId,
        latest_artifact_revision: artifactRevision,
        blockers: [],
        next_action:
          target.route === "company_context"
            ? `Reply exactly \`${exactContextPublishPhrase}\` to publish the approved compact brief.`
            : "Use the approved draft artifact in a later review-only workflow.",
        handoff_id: target.handoff_id,
      });
    }

    return {
      type: "text",
      text: [
        renderArtifactApprovalReceipt({
          artifactId,
          artifactRevision,
          runId: target.run_id,
          specialist: target.specialist,
          approvalText: recordedApprovalText,
        }),
        ...(target.route === "company_context"
          ? [
              "",
              `Workspace Context is still unchanged. To publish the approved compact brief, reply exactly: \`${exactContextPublishPhrase}\`.`,
            ]
          : []),
      ].join("\n"),
    };
  } catch (error) {
    return {
      type: "text",
      text: [
        "# Marketing OS Approval",
        "",
        artifactApproved
          ? `Artifact ${artifactId} revision ${artifactRevision} was approved, but the related cockpit records could not all be synchronized.`
          : `Artifact ${artifactId} revision ${artifactRevision} was not approved because the Guild cockpit transition failed.`,
        "",
        `Workflow run: ${target.run_id}`,
        `Details: ${safeError(error)}`,
        artifactApproved
          ? "Status: approval recorded; cockpit synchronization blocked"
          : "Status: approval blocked safely",
        "No publishing, scheduling, spend, CRM mutation, context publication, or other external action occurred.",
      ].join("\n"),
    };
  }
}

async function publishApprovedCompanyContext(
  exactText: string,
  cockpit: SerializableSessionCockpit,
): Promise<z.infer<typeof outputSchema>> {
  if (exactText.trim().toLowerCase() !== exactContextPublishPhrase) {
    return {
      type: "text",
      text: renderGuide(
        `Workspace Context publication requires this exact phrase: \`${exactContextPublishPhrase}\`.`,
        "exact publication confirmation required",
      ),
    };
  }

  const target = cockpit.state.runs.find(
      (candidate) =>
        candidate.route === "company_context" &&
        candidate.status === "approved" &&
        candidate.artifact_id &&
        candidate.artifact_revision,
    );
  if (!target || !target.artifact_id || !target.artifact_revision) {
    return {
      type: "text",
      text: renderGuide(
        "No approved Company Context artifact revision exists in this canonical Chat. Build and approve Company Context first.",
        "approved company context required",
      ),
    };
  }

  try {
    const artifact = artifactResponseSchema.parse(
      applyCockpitOperation(cockpit, "artifactGet", {
        artifactId: target.artifact_id,
        revision: target.artifact_revision,
      }),
    ).data;
    if (artifact.status !== "approved") {
      throw new Error("The selected Company Context artifact is not approved.");
    }

    const managedBlock = renderManagedContextBlock({
      artifactBody: artifact.markdown_body,
      artifactId: artifact.artifact_id,
      artifactRevision: artifact.revision,
      canonicalSessionId:
        cockpit.state.canonical_session_id ?? "this Marketing OS Chat",
    });

    return {
      type: "text",
      text: [
        "# Publish Company Context in Guild",
        "",
        "Your approved compact company brief is ready. Guild requires the final publish action in the workspace Context screen, so Workspace Context is still unchanged.",
        "",
        "## Finish in Guild",
        "",
        "1. Open the workspace sidebar and select **Context**.",
        "2. Keep any existing workspace notes.",
        "3. Append the approved block below.",
        "4. Click **Publish**.",
        "5. Start a new Chat and ask for marketing work in ordinary language. The specialists will receive this context automatically.",
        "",
        "## Approved compact context",
        "",
        "```markdown",
        managedBlock,
        "```",
        "",
        `Approved artifact: ${artifact.artifact_id} revision ${artifact.revision}`,
        "Status: ready for Guild Context publication",
        "No workspace context, publishing, scheduling, spend, CRM data, or other external system changed in this step.",
      ].join("\n"),
    };
  } catch (error) {
    return {
      type: "text",
      text: [
        "# Marketing OS Workspace Context",
        "",
        "The exact publication confirmation was received, but the approved compact context could not be prepared.",
        `Details: ${safeError(error)}`,
        "Status: context preparation blocked safely",
        "The approved Company Context artifact remains in this canonical Chat for retry.",
        "No publishing, scheduling, spend, CRM mutation, or other external marketing action occurred.",
      ].join("\n"),
    };
  }
}

function renderManagedContextBlock({
  artifactBody,
  artifactId,
  artifactRevision,
  canonicalSessionId,
}: {
  artifactBody: string;
  artifactId: string;
  artifactRevision: number;
  canonicalSessionId: string;
}): string {
  const readyBlock =
    extractFencedSection(
      artifactBody,
      "### Ready-To-Publish Workspace Context",
    ) ||
    extractSection(artifactBody, "### Guild Workspace Context Draft") ||
    "Approved company context is available in the canonical Marketing OS cockpit.";
  const downstreamBlock =
    extractFencedSection(artifactBody, "### Context For Downstream Agents") ||
    extractSection(artifactBody, "## Downstream Handoff") ||
    "Use only approved company context and keep all work draft-only.";
  const companyMatch = readyBlock.match(/^\s*Company:\s*(.+)$/im);
  const company =
    companyMatch && companyMatch[1]
      ? companyMatch[1].trim()
      : "Approved company";

  return [
    "<!-- guild-marketing-os-context:start -->",
    "# Guild Marketing OS Managed Company Context",
    "",
    "Status: published",
    `Company: ${company}`,
    `Artifact: ${artifactId} revision ${artifactRevision}`,
    `Canonical cockpit session: ${canonicalSessionId}`,
    "",
    "## Workspace Context Brief",
    readyBlock.trim(),
    "",
    "## Downstream Handoff Context",
    downstreamBlock.trim(),
    "",
    "## Operating Rules",
    "- Use only approved or user-supplied facts.",
    "- Label missing evidence and conflicts.",
    "- Keep all outputs draft-only.",
    "- Do not publish, schedule, change spend, mutate CRM data, configure credentials, or grant legal approval.",
    "<!-- guild-marketing-os-context:end -->",
  ].join("\n");
}

function extractFencedSection(text: string, heading: string): string {
  const section = extractSection(text, heading);
  const match = section.match(/```(?:text|markdown)?\s*([\s\S]*?)```/i);
  return match && match[1] ? match[1].trim() : "";
}

function extractSection(text: string, heading: string): string {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(
    new RegExp(`${escaped}\\s*([\\s\\S]*?)(?=\\n#{2,3}\\s|$)`, "i"),
  );
  return match && match[1] ? match[1].trim() : "";
}

function renderCockpitExport(cockpit: SerializableSessionCockpit): string {
  const state = cockpit.state;
  const exported = {
    format: "guild-marketing-os-cockpit",
    format_version: 1,
    exported_at: new Date().toISOString(),
    canonical_session_id: state.canonical_session_id,
    published_context_id: state.published_context_id,
    runs: state.runs,
    artifacts: state.artifacts,
    workstreams: state.workstreams,
    handoffs: state.handoffs,
    audit_trail: state.audit_trail,
  };
  return [
    "# Marketing OS Cockpit Export",
    "",
    "This is the complete structured Marketing OS state retained by this canonical Chat.",
    "",
    "```json",
    JSON.stringify(exported, null, 2),
    "```",
    "",
    "No external action was performed.",
  ].join("\n");
}

function isCompanyContextArtifactReadRequest(text: string): boolean {
  const normalized = text.trim();
  return (
    /^show\s+(?:the\s+)?current\s+company context\s+(?:draft|artifact)\s*[.!]?$/i.test(
      normalized,
    ) ||
    /^show\s+company context\s+artifact\s+revision\s+\d+\s*[.!]?$/i.test(
      normalized,
    )
  );
}

function renderCompanyContextArtifactRead(
  requestText: string,
  cockpit: SerializableSessionCockpit,
): string {
  const requestedRevision = requestText.match(/\brevision\s+(\d+)\b/i)?.[1];
  const workstream = cockpit.state.workstreams.find(
    (candidate) => candidate.specialist === "Company Context Builder",
  );
  const preferredArtifactId = workstream?.latest_artifact_id ?? undefined;
  const candidates = cockpit.state.artifacts
    .filter(
      (artifact) =>
        artifact.artifact_type === "company_context" &&
        (!preferredArtifactId || artifact.artifact_id === preferredArtifactId) &&
        (!requestedRevision || artifact.revision === Number(requestedRevision)),
    )
    .sort((left, right) => right.updated_at.localeCompare(left.updated_at));
  const artifact = candidates[0];

  if (!artifact) {
    return renderGuide(
      requestedRevision
        ? `Company Context artifact revision ${requestedRevision} was not found in this Chat.`
        : "No Company Context artifact is retained in this Chat yet.",
      "artifact not found",
    );
  }

  return [
    "# Company Context Artifact",
    "",
    `Artifact: ${artifact.artifact_id}`,
    `Revision: ${artifact.revision}`,
    `Status: ${artifact.status}`,
    "",
    artifact.markdown_body,
    "",
    "---",
    "Read-only retrieval: Workspace Context and external systems were unchanged.",
  ].join("\n");
}

function formatRepairInput(
  priorText: string,
  errors: string[],
  contextRevision: string,
  route: DelegatedRoute,
  expectedHipaaConstraint?: string,
): z.infer<typeof specialistInputSchema> {
  return specialistInput(
    [
      "FORMAT REPAIR ONLY.",
      "Preserve the substantive content from the prior attempt; do not add new claims.",
      `Repair these validation errors: ${errors.join("; ")}`,
      "Return the complete corrected artifact with the seven required headings, an explicit evidence mode, and a draft-only safety envelope.",
      "",
      "Prior attempt:",
      priorText,
    ].join("\n"),
    contextRevision,
    route,
    expectedHipaaConstraint,
  );
}

function applyCockpitOperation(
  cockpit: SerializableSessionCockpit,
  operation: Parameters<typeof reduceSessionCockpitOperation>[1],
  input?: unknown,
): unknown {
  const result = reduceSessionCockpitOperation(
    cockpit.state,
    operation,
    input,
  );
  cockpit.state = result.state;
  return result.response;
}

function finishBlockedRun(
  cockpit: SerializableSessionCockpit,
  run: WorkflowRun,
  workstream: WorkstreamRecord,
  idempotencyPrefix: string,
  reason: string,
): void {
  applyCockpitOperation(cockpit, "runUpdate", {
    runId: run.run_id,
    idempotency_key: `${idempotencyPrefix}-blocked`,
    expected_revision: run.revision,
    status: "blocked",
    blockers: [reason],
    next_action: "Review the retained specialist attempt and resolve the blocker.",
  });
  applyCockpitOperation(cockpit, "workstreamUpdate", {
    specialist: run.specialist,
    idempotency_key: `${idempotencyPrefix}-workstream-blocked`,
    expected_revision: workstream.revision,
    status: "blocked",
    blockers: [reason],
    next_action: "Review the retained specialist attempt and resolve the blocker.",
  });
}

function finishFailedRun(
  cockpit: SerializableSessionCockpit,
  run: WorkflowRun,
  workstream: WorkstreamRecord,
  idempotencyPrefix: string,
  reason: string,
): void {
  applyCockpitOperation(cockpit, "runUpdate", {
    runId: run.run_id,
    idempotency_key: `${idempotencyPrefix}-failed`,
    expected_revision: run.revision,
    status: "failed",
    blockers: [reason],
    next_action: "Inspect the retained attempt and start a new run after correction.",
    error_summary: reason,
  });
  applyCockpitOperation(cockpit, "workstreamUpdate", {
    specialist: run.specialist,
    idempotency_key: `${idempotencyPrefix}-workstream-failed`,
    expected_revision: workstream.revision,
    status: "failed",
    blockers: [reason],
    next_action: "Inspect the retained attempt and start a new run after correction.",
  });
}

function completeCockpitRun(
  cockpit: SerializableSessionCockpit,
  runId: string,
): void {
  applyCockpitOperation(
    cockpit,
    "setState",
    completeRunState(cockpit.state, runId),
  );
}

function hasSuccessfulArtifactCheckpoint(run: WorkflowRun): boolean {
  return Boolean(
    run.artifact_id &&
      run.artifact_revision &&
      run.attempts.some((attempt) => attempt.status === "succeeded"),
  );
}

function findResumableRun(
  runs: WorkflowRun[],
  route: DelegatedRoute,
): WorkflowRun | undefined {
  const candidates = runs.filter((candidate) => {
    if (candidate.route !== route) return false;
    if (
      ["running", "needs_input", "ready_for_review"].includes(
        candidate.status,
      )
    ) {
      return true;
    }
    return (
      ["blocked", "failed"].includes(candidate.status) &&
      hasSuccessfulArtifactCheckpoint(candidate)
    );
  });
  const baseRuns = candidates.filter((candidate) => {
    const originalRequest = candidate.input_envelope.user_request;
    return (
      typeof originalRequest !== "string" ||
      !resumeRequested(originalRequest)
    );
  });
  return (baseRuns.length ? baseRuns : candidates)[0];
}

function isExactContextPublishConfirmation(text: string): boolean {
  return text.trim().toLowerCase() === exactContextPublishPhrase;
}

function isCockpitExportRequest(text: string): boolean {
  return /\b(?:export|download|back up|backup)\b[\s\S]{0,80}\b(?:marketing os|cockpit|artifacts?|workstreams?)\b/i.test(
    text,
  );
}

function isCockpitDeleteRequest(text: string): boolean {
  return /\b(?:delete|erase|clear|remove)\b[\s\S]{0,80}\b(?:marketing os|cockpit)\b/i.test(
    text,
  );
}

function isExactCockpitDeleteConfirmation(text: string): boolean {
  return text.trim().toLowerCase() === exactCockpitDeletePhrase;
}

export default agent({
  identifier: "guild_marketing_os_launcher",
  description:
    "Routes draft-only marketing work to the canonical public Marketing OS suite, returns complete review artifacts, and keeps a cockpit in one continuing Guild Chat without executing marketing actions.",
  inputSchema,
  outputSchema,
  tools,
  run,
});
