"use agent";

import {
  agent,
  guildAgentTool,
  guildServiceTool,
  guildTools,
  pick,
  type Task,
} from "@guildai/agents-sdk";
import { z } from "zod";
import {
  classifyRoute,
  extractSpecialistText,
  inputSchema,
  installedSuiteAgents,
  onlyFormatErrors,
  outputSchema,
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
  suiteInstallOrder,
  validateSpecialistOutput,
  type DelegatedRoute,
} from "./launcher-core.js";
import {
  allocateRunIdentity,
  artifactResponseSchema,
  completeRunState,
  createHandoffRequestSchema,
  createWorkflowRunRequestSchema,
  evidenceModeFromArtifact,
  handoffRationale,
  handoffResponseSchema,
  listWorkflowRunsRequestSchema,
  readLauncherAgentState,
  readWorkflowRunRequestSchema,
  readWorkstreamRequestSchema,
  recordWorkflowAttemptRequestSchema,
  renderCockpitReceipt,
  renderCockpitStatus,
  resumeRequested,
  storeArtifactRequestSchema,
  updateWorkflowRunRequestSchema,
  updateWorkstreamRequestSchema,
  workflowAttemptResponseSchema,
  workflowRunResponseSchema,
  workflowRunsResponseSchema,
  workstreamResponseSchema,
  type LauncherAgentState,
  type WorkflowRun,
  type WorkstreamRecord,
} from "./launcher-state.js";

export {
  deterministicRoute,
  removeCompiledWorkspaceContext,
  renderDelegatedResult,
  renderOnboardingStatus,
  validateSpecialistOutput,
} from "./launcher-core.js";

const tools = {
  ...pick(guildTools, [
    "guild_agent_install_request",
    "guild_get_agent_version",
    "guild_get_task_workspace_agents",
  ]),
  marketing_os_company_context_builder: guildAgentTool({
    inputSchema: specialistInputSchema,
    outputSchema: specialistOutputSchema,
    calls: "michaelpreuss~guild-marketing-os-company-context-builder",
  }),
  marketing_os_market_signal: guildAgentTool({
    inputSchema: specialistInputSchema,
    outputSchema: specialistOutputSchema,
    calls: "michaelpreuss~guild-marketing-os-market-signal",
  }),
  marketing_os_icp: guildAgentTool({
    inputSchema: specialistInputSchema,
    outputSchema: specialistOutputSchema,
    calls: "michaelpreuss~guild-marketing-os-icp",
  }),
  marketing_os_audience_segmentation: guildAgentTool({
    inputSchema: specialistInputSchema,
    outputSchema: specialistOutputSchema,
    calls: "michaelpreuss~guild-marketing-os-audience-segmentation",
  }),
  marketing_os_messaging: guildAgentTool({
    inputSchema: specialistInputSchema,
    outputSchema: specialistOutputSchema,
    calls: "michaelpreuss~guild-marketing-os-messaging",
  }),
  marketing_os_branding_pitch_deck: guildAgentTool({
    inputSchema: specialistInputSchema,
    outputSchema: specialistOutputSchema,
    calls: "michaelpreuss~guild-marketing-os-branding-pitch-deck",
  }),
  marketing_os_social_monitoring_content: guildAgentTool({
    inputSchema: specialistInputSchema,
    outputSchema: specialistOutputSchema,
    calls: "michaelpreuss~guild-marketing-os-social-monitoring-content",
  }),
  marketing_os_campaigns_paid_media: guildAgentTool({
    inputSchema: specialistInputSchema,
    outputSchema: specialistOutputSchema,
    calls: "michaelpreuss~guild-marketing-os-campaigns-paid-media",
  }),
  marketing_os_run_create: guildServiceTool("guild-marketing-os-state", {
    description:
      "Create a tenant-bound durable Marketing OS Launcher workflow run before invoking a specialist.",
    inputSchema: createWorkflowRunRequestSchema,
    outputSchema: workflowRunResponseSchema,
    endpoint: {
      method: "POST",
      path: "/v1/runs",
      description: "Create a Marketing OS workflow run",
      format: "application/json",
      parameters: Object.entries(createWorkflowRunRequestSchema.shape).map(
        ([name, schema]) => ({ name, type: "body" as const, schema }),
      ),
      parameterSchema: createWorkflowRunRequestSchema,
      responseSchema: workflowRunResponseSchema,
      errors: [],
    },
  }),
  marketing_os_run_get: guildServiceTool("guild-marketing-os-state", {
    description:
      "Read one tenant-bound Marketing OS workflow run and all immutable attempts.",
    inputSchema: readWorkflowRunRequestSchema,
    outputSchema: workflowRunResponseSchema,
    endpoint: {
      method: "GET",
      path: "/v1/runs/{runId}",
      description: "Read a Marketing OS workflow run",
      format: "application/json",
      parameters: [
        {
          name: "runId",
          type: "path",
          schema: readWorkflowRunRequestSchema.shape.runId,
        },
      ],
      parameterSchema: readWorkflowRunRequestSchema,
      responseSchema: workflowRunResponseSchema,
      errors: [],
    },
  }),
  marketing_os_runs_list: guildServiceTool("guild-marketing-os-state", {
    description:
      "List tenant-bound Marketing OS workflow runs for cockpit status and cross-session resume.",
    inputSchema: listWorkflowRunsRequestSchema,
    outputSchema: workflowRunsResponseSchema,
    endpoint: {
      method: "GET",
      path: "/v1/runs",
      description: "List Marketing OS workflow runs",
      format: "application/json",
      parameters: [],
      parameterSchema: listWorkflowRunsRequestSchema,
      responseSchema: workflowRunsResponseSchema,
      errors: [],
    },
  }),
  marketing_os_attempt_record: guildServiceTool("guild-marketing-os-state", {
    description:
      "Append one immutable initial or format-repair specialist attempt to a durable workflow run.",
    inputSchema: recordWorkflowAttemptRequestSchema,
    outputSchema: workflowAttemptResponseSchema,
    endpoint: {
      method: "POST",
      path: "/v1/runs/{runId}/attempts",
      description: "Record a Marketing OS specialist attempt",
      format: "application/json",
      parameters: [
        {
          name: "runId",
          type: "path",
          schema: recordWorkflowAttemptRequestSchema.shape.runId,
        },
        ...Object.entries(recordWorkflowAttemptRequestSchema.shape)
          .filter(([name]) => name !== "runId")
          .map(([name, schema]) => ({
            name,
            type: "body" as const,
            schema,
          })),
      ],
      parameterSchema: recordWorkflowAttemptRequestSchema,
      responseSchema: workflowAttemptResponseSchema,
      errors: [],
    },
  }),
  marketing_os_artifact_store: guildServiceTool("guild-marketing-os-state", {
    description:
      "Store a validated draft-only specialist artifact as an immutable Marketing OS artifact revision.",
    inputSchema: storeArtifactRequestSchema,
    outputSchema: artifactResponseSchema,
    endpoint: {
      method: "POST",
      path: "/v1/artifacts",
      description: "Store a Marketing OS artifact",
      format: "application/json",
      parameters: Object.entries(storeArtifactRequestSchema.shape).map(
        ([name, schema]) => ({ name, type: "body" as const, schema }),
      ),
      parameterSchema: storeArtifactRequestSchema,
      responseSchema: artifactResponseSchema,
      errors: [],
    },
  }),
  marketing_os_handoff_create: guildServiceTool("guild-marketing-os-state", {
    description:
      "Create a durable handoff from a specialist artifact back to the Marketing OS Launcher cockpit.",
    inputSchema: createHandoffRequestSchema,
    outputSchema: handoffResponseSchema,
    endpoint: {
      method: "POST",
      path: "/v1/handoffs",
      description: "Create a Marketing OS handoff",
      format: "application/json",
      parameters: Object.entries(createHandoffRequestSchema.shape).map(
        ([name, schema]) => ({ name, type: "body" as const, schema }),
      ),
      parameterSchema: createHandoffRequestSchema,
      responseSchema: handoffResponseSchema,
      errors: [],
    },
  }),
  marketing_os_run_update: guildServiceTool("guild-marketing-os-state", {
    description:
      "Update durable Marketing OS workflow status with its artifact, blocker, error, and handoff.",
    inputSchema: updateWorkflowRunRequestSchema,
    outputSchema: workflowRunResponseSchema,
    endpoint: {
      method: "PUT",
      path: "/v1/runs/{runId}",
      description: "Update a Marketing OS workflow run",
      format: "application/json",
      parameters: [
        {
          name: "runId",
          type: "path",
          schema: updateWorkflowRunRequestSchema.shape.runId,
        },
        ...Object.entries(updateWorkflowRunRequestSchema.shape)
          .filter(([name]) => name !== "runId")
          .map(([name, schema]) => ({
            name,
            type: "body" as const,
            schema,
          })),
      ],
      parameterSchema: updateWorkflowRunRequestSchema,
      responseSchema: workflowRunResponseSchema,
      errors: [],
    },
  }),
  marketing_os_workstream_read: guildServiceTool("guild-marketing-os-state", {
    description:
      "Read one durable Marketing OS specialist workstream for cockpit rendering and optimistic updates.",
    inputSchema: readWorkstreamRequestSchema,
    outputSchema: workstreamResponseSchema,
    endpoint: {
      method: "GET",
      path: "/v1/workstreams/{specialist}",
      description: "Read a Marketing OS workstream",
      format: "application/json",
      parameters: [
        {
          name: "specialist",
          type: "path",
          schema: readWorkstreamRequestSchema.shape.specialist,
        },
      ],
      parameterSchema: readWorkstreamRequestSchema,
      responseSchema: workstreamResponseSchema,
      errors: [],
    },
  }),
  marketing_os_workstream_update: guildServiceTool(
    "guild-marketing-os-state",
    {
      description:
        "Update one durable Marketing OS workstream with status, artifact, blocker, and next action.",
      inputSchema: updateWorkstreamRequestSchema,
      outputSchema: workstreamResponseSchema,
      endpoint: {
        method: "PUT",
        path: "/v1/workstreams/{specialist}",
        description: "Update a Marketing OS workstream",
        format: "application/json",
        parameters: [
          {
            name: "specialist",
            type: "path",
            schema: updateWorkstreamRequestSchema.shape.specialist,
          },
          ...Object.entries(updateWorkstreamRequestSchema.shape)
            .filter(([name]) => name !== "specialist")
            .map(([name, schema]) => ({
              name,
              type: "body" as const,
              schema,
            })),
        ],
        parameterSchema: updateWorkstreamRequestSchema,
        responseSchema: workstreamResponseSchema,
        errors: [],
      },
    },
  ),
};

type Tools = typeof tools;
type LauncherTask = Task<Tools, LauncherAgentState>;

async function run(
  input: z.infer<typeof inputSchema>,
  task: LauncherTask,
): Promise<z.infer<typeof outputSchema>> {
  const context = readContextSnapshot(input.text);
  const userText = removeCompiledWorkspaceContext(input.text, context.compiled);
  const classification = await classifyRoute(userText, task);

  if (classification.route === "blocked") {
    return {
      type: "text",
      text: renderBlocked(
        "V1 is draft-only. Publishing, scheduling, spend, CRM mutation, credential setup, legal approval, recursive delegation, and arbitrary-agent invocation are not supported.",
      ),
    };
  }

  if (classification.route === "guide") {
    return {
      type: "text",
      text: renderGuide(
        "I could not determine one safe specialist workflow. Name the desired outcome—company context, market signal, ICP, audience segmentation, messaging, brand/deck, social/content, or campaigns/paid media.",
      ),
    };
  }

  const workspaceAgents = await task.tools.guild_get_task_workspace_agents({});
  const installed = installedSuiteAgents(workspaceAgents);

  if (classification.route === "onboarding") {
    const missing = suiteInstallOrder.find(
      (entry) => !installed.some((record) => record.packageName === entry.packageName),
    );
    if (missing) {
      try {
        await task.tools.guild_agent_install_request({ agent_id: missing.agentId });
        return {
          type: "text",
          text: [
            "# Marketing OS Onboarding",
            "",
            `${missing.displayName} installation was approved. Continue onboarding to verify it and request the next missing package.`,
            "",
            "No other installation request was made.",
          ].join("\n"),
        };
      } catch {
        return {
          type: "text",
          text: [
            "# Marketing OS Onboarding",
            "",
            `${missing.displayName} is still unavailable. Its installation request was denied, suspended, or failed, and onboarding remains resumable.`,
            "",
            "No other installation request was made.",
          ].join("\n"),
        };
      }
    }

    return { type: "text", text: renderOnboardingStatus(installed) };
  }

  if (classification.route === "cockpit") {
    try {
      const runs = workflowRunsResponseSchema.parse(
        await task.tools.marketing_os_runs_list({}),
      ).data;
      const workstreamResponses = await Promise.all(
        suiteInstallOrder.map((entry) =>
          task.tools.marketing_os_workstream_read({
            specialist: entry.displayName,
          }),
        ),
      );
      const workstreams = workstreamResponses
        .map(
          (response) =>
            workstreamResponseSchema.parse(response).data,
        )
        .filter(
          (value): value is WorkstreamRecord => value !== undefined,
        );
      return {
        type: "text",
        text: renderCockpitStatus(workstreams, runs),
      };
    } catch (error) {
      return {
        type: "text",
        text: renderBlocked(
          `Durable Marketing OS cockpit state is unavailable: ${safeError(error)}. No specialist was started.`,
        ),
      };
    }
  }

  const route = classification.route as DelegatedRoute;
  const config = routeConfig[route];
  const installedAgent = installed.find(
    (record) => record.packageName === config.packageName,
  );

  if (route !== "company_context" && !context.ready) {
    return {
      type: "text",
      text: renderGuide(
        "Approved published Marketing OS context is not ready. Use Company Context Builder first; approve the context artifact, then confirm publication with the exact required phrase.",
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

  let packageVersion = installedAgent.versionId;
  try {
    const version = await task.tools.guild_get_agent_version({
      agent_id: config.agentId,
      version_id: installedAgent.versionId,
    });
    if (
      typeof version.version_number === "string" &&
      version.version_number.trim()
    ) {
      packageVersion = version.version_number.trim();
    }
  } catch {
    // The immutable installed version ID remains sufficient provenance when
    // the friendly semantic version lookup is temporarily unavailable.
  }

  let sessionState = readLauncherAgentState(await task.restore());
  let currentRun: WorkflowRun | undefined;
  let idempotencyPrefix = "";
  let requestText = userText;

  if (resumeRequested(userText)) {
    try {
      const runs = workflowRunsResponseSchema.parse(
        await task.tools.marketing_os_runs_list({}),
      ).data;
      currentRun = runs.find(
        (candidate) =>
          candidate["route"] === route &&
          ["running", "needs_input", "ready_for_review"].includes(
            candidate.status,
          ),
      );
      if (currentRun) {
        idempotencyPrefix = `launcher-${currentRun.run_id}`;
        const originalRequest = currentRun.input_envelope.user_request;
        if (typeof originalRequest === "string" && originalRequest.trim()) {
          requestText = originalRequest.trim();
        }
        sessionState = {
          ...sessionState,
          active_run: {
            request_fingerprint: `adopted:${currentRun.run_id}`,
            run_id: currentRun.run_id,
            run_sequence: sessionState.next_run_sequence + 1,
            route,
          },
          next_run_sequence: sessionState.next_run_sequence + 1,
        };
        await task.save(sessionState);
      }
    } catch (error) {
      return {
        type: "text",
        text: renderBlocked(
          `Could not inspect durable work before resuming: ${safeError(error)}. No specialist was started.`,
        ),
      };
    }
  }

  if (!currentRun) {
    const allocation = allocateRunIdentity(
      sessionState,
      task.sessionId,
      route,
      requestText,
      context.contextRevision,
    );
    sessionState = allocation.state;
    idempotencyPrefix = allocation.idempotencyPrefix;
    await task.save(sessionState);

    if (allocation.reused) {
      try {
        currentRun = workflowRunResponseSchema.parse(
          await task.tools.marketing_os_run_get({
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
          await task.tools.marketing_os_run_create({
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
            `Durable cockpit initialization failed: ${safeError(error)}. No specialist was started.`,
          ),
        };
      }
    }
  }

  if (!currentRun) {
    return {
      type: "text",
      text: renderBlocked(
        "Durable cockpit initialization returned no workflow run. No specialist was started.",
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
    if (completedText && currentRun.artifact_id && currentRun.artifact_revision) {
      await task.save(completeRunState(sessionState, currentRun.run_id));
      return {
        type: "text",
        text: [
          renderDelegatedResult(config.displayName, completedText),
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

  if (["blocked", "failed", "approved"].includes(currentRun.status)) {
    await task.save(completeRunState(sessionState, currentRun.run_id));
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

  if (currentRun.status === "needs_input") {
    try {
      currentRun = workflowRunResponseSchema.parse(
        await task.tools.marketing_os_run_update({
          runId: currentRun.run_id,
          idempotency_key: `${idempotencyPrefix}-resume`,
          expected_revision: currentRun.revision,
          status: "running",
          blockers: [],
          next_action: `Resume ${config.displayName}.`,
        }),
      ).data;
    } catch (error) {
      return {
        type: "text",
        text: renderBlocked(
          `Could not reopen the durable workflow: ${safeError(error)}. No new specialist attempt was started.`,
        ),
      };
    }
  }

  let workstream: WorkstreamRecord | undefined;
  try {
    workstream = workstreamResponseSchema.parse(
      await task.tools.marketing_os_workstream_read({
        specialist: config.displayName,
      }),
    ).data;
    const updatedWorkstream = workstreamResponseSchema.parse(
      await task.tools.marketing_os_workstream_update({
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
    if (!updatedWorkstream) {
      throw new Error("State service returned no workstream record.");
    }
    workstream = updatedWorkstream;
  } catch (error) {
    return {
      type: "text",
      text: renderBlocked(
        `Durable workstream initialization failed: ${safeError(error)}. No new specialist attempt was started.`,
      ),
    };
  }
  if (!workstream) {
    return {
      type: "text",
      text: renderBlocked(
        "Durable workstream initialization returned no record. No new specialist attempt was started.",
      ),
    };
  }

  const existingCompletedAttempt = [...currentRun.attempts]
    .reverse()
    .find((attempt) => attempt.status === "succeeded");
  let completedText = existingCompletedAttempt
    ? existingCompletedAttempt.output_body
    : undefined;
  let nextAttemptNumber: 1 | 2 = currentRun.attempts.length === 0 ? 1 : 2;
  let nextAttemptKind: "initial" | "format_repair" =
    nextAttemptNumber === 1 ? "initial" : "format_repair";
  let finalAttemptCount = currentRun.attempts.length;
  let delegatedInput = specialistInput(
    requestText,
    context.contextRevision,
    route,
  );

  const previousAttempt = currentRun.attempts.at(-1);
  if (!completedText && previousAttempt) {
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
      );
    } else {
      const reason =
        previousAttempt.error_message ??
        (previousAttempt.validation_errors.join("; ") ||
          "The prior specialist attempt cannot be retried automatically.");
      if (previousAttempt.status === "safety_failed") {
        await finishBlockedRun(
          task,
          currentRun,
          workstream,
          idempotencyPrefix,
          reason,
        );
      } else {
        await finishFailedRun(
          task,
          currentRun,
          workstream,
          idempotencyPrefix,
          reason,
        );
      }
      await task.save(completeRunState(sessionState, currentRun.run_id));
      return {
        type: "text",
        text: renderSpecialistBlocked(reason, currentRun.run_id),
      };
    }
  }

  while (!completedText) {
    let attemptOutput: z.infer<typeof specialistOutputSchema>;
    try {
      attemptOutput = await invokeSpecialist(route, delegatedInput, task);
    } catch (error) {
      const message = safeError(error);
      try {
        await task.tools.marketing_os_attempt_record({
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
        finalAttemptCount = Math.max(
          finalAttemptCount,
          nextAttemptNumber,
        );
        await finishFailedRun(
          task,
          currentRun,
          workstream,
          idempotencyPrefix,
          `Specialist failed: ${message}`,
        );
      } catch (stateError) {
        return {
          type: "text",
          text: renderSpecialistBlocked(
            `Specialist failed and durable failure recording also failed: ${safeError(stateError)}`,
            currentRun.run_id,
            false,
          ),
        };
      }
      await task.save(completeRunState(sessionState, currentRun.run_id));
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
        })
      : ["Empty or unsupported specialist output."];
    const attemptStatus =
      errors.length === 0
        ? "succeeded"
        : onlyFormatErrors(errors)
          ? "format_invalid"
          : "safety_failed";

    try {
      await task.tools.marketing_os_attempt_record({
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
          `The specialist returned a result, but its durable attempt record failed: ${safeError(error)}. The result was not imported into the cockpit.`,
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
      await finishBlockedRun(
        task,
        currentRun,
        workstream,
        idempotencyPrefix,
        reason,
      );
      await task.save(completeRunState(sessionState, currentRun.run_id));
      return {
        type: "text",
        text: renderSpecialistBlocked(reason, currentRun.run_id),
      };
    }

    if (nextAttemptNumber === 2) {
      const reason = `Specialist format repair failed validation: ${errors.join("; ")}`;
      await finishFailedRun(
        task,
        currentRun,
        workstream,
        idempotencyPrefix,
        reason,
      );
      await task.save(completeRunState(sessionState, currentRun.run_id));
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
    );
    nextAttemptNumber = 2;
    nextAttemptKind = "format_repair";
  }

  if (!completedText) {
    return {
      type: "text",
      text: renderSpecialistBlocked(
        "No validated specialist output was available for durable artifact storage.",
        currentRun.run_id,
      ),
    };
  }

  try {
    const artifact = artifactResponseSchema.parse(
      await task.tools.marketing_os_artifact_store({
        idempotency_key: `${idempotencyPrefix}-artifact`,
        artifact_type: route,
        markdown_body: completedText,
        consumed_context_revision: context.contextRevision,
        consumed_source_revisions: [],
        evidence: [{ mode: evidenceModeFromArtifact(completedText) }],
        status: "ready_for_review",
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
    const handoff = handoffResponseSchema.parse(
      await task.tools.marketing_os_handoff_create({
        idempotency_key: `${idempotencyPrefix}-handoff`,
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
    const readyRun = workflowRunResponseSchema.parse(
      await task.tools.marketing_os_run_update({
        runId: currentRun.run_id,
        idempotency_key: `${idempotencyPrefix}-ready`,
        expected_revision: currentRun.revision,
        status: "ready_for_review",
        artifact_id: artifact.artifact_id,
        artifact_revision: artifact.revision,
        handoff_id: handoff.handoff_id,
        blockers: [],
        next_action: `Review ${config.displayName} artifact revision ${artifact.revision}.`,
      }),
    ).data;
    await task.tools.marketing_os_workstream_update({
      specialist: config.displayName,
      idempotency_key: `${idempotencyPrefix}-workstream-ready`,
      expected_revision: workstream.revision,
      status: "ready_for_review",
      latest_artifact_id: artifact.artifact_id,
      latest_artifact_revision: artifact.revision,
      blockers: [],
      next_action: `Review ${config.displayName} artifact revision ${artifact.revision}.`,
      handoff_id: handoff.handoff_id,
    });
    await task.save(completeRunState(sessionState, currentRun.run_id));
    return {
      type: "text",
      text: [
        renderDelegatedResult(config.displayName, completedText),
        "",
        renderCockpitReceipt({
          artifactId: artifact.artifact_id,
          artifactRevision: artifact.revision,
          runId: readyRun.run_id,
          packageVersion: readyRun.package_version,
          contextRevision: readyRun.context_revision ?? "unavailable",
        }),
      ].join("\n"),
    };
  } catch (error) {
    const reason = `Validated specialist output could not be finalized in the durable cockpit: ${safeError(error)}`;
    try {
      await finishFailedRun(
        task,
        currentRun,
        workstream,
        idempotencyPrefix,
        reason,
      );
    } catch {
      // Preserve the original persistence failure in the user-visible result.
    }
    return {
      type: "text",
      text: renderSpecialistBlocked(reason, currentRun.run_id),
    };
  }
}

function formatRepairInput(
  priorText: string,
  errors: string[],
  contextRevision: string,
  route: DelegatedRoute,
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
  );
}

async function finishBlockedRun(
  task: LauncherTask,
  run: WorkflowRun,
  workstream: WorkstreamRecord,
  idempotencyPrefix: string,
  reason: string,
): Promise<void> {
  await task.tools.marketing_os_run_update({
    runId: run.run_id,
    idempotency_key: `${idempotencyPrefix}-blocked`,
    expected_revision: run.revision,
    status: "blocked",
    blockers: [reason],
    next_action:
      "Review the retained specialist attempt and resolve the blocker.",
  });
  await task.tools.marketing_os_workstream_update({
    specialist: run.specialist,
    idempotency_key: `${idempotencyPrefix}-workstream-blocked`,
    expected_revision: workstream.revision,
    status: "blocked",
    blockers: [reason],
    next_action:
      "Review the retained specialist attempt and resolve the blocker.",
  });
}

async function finishFailedRun(
  task: LauncherTask,
  run: WorkflowRun,
  workstream: WorkstreamRecord,
  idempotencyPrefix: string,
  reason: string,
): Promise<void> {
  await task.tools.marketing_os_run_update({
    runId: run.run_id,
    idempotency_key: `${idempotencyPrefix}-failed`,
    expected_revision: run.revision,
    status: "failed",
    blockers: [reason],
    next_action:
      "Inspect the retained attempt and start a new run after correction.",
    error_summary: reason,
  });
  await task.tools.marketing_os_workstream_update({
    specialist: run.specialist,
    idempotency_key: `${idempotencyPrefix}-workstream-failed`,
    expected_revision: workstream.revision,
    status: "failed",
    blockers: [reason],
    next_action:
      "Inspect the retained attempt and start a new run after correction.",
  });
}

async function invokeSpecialist(
  route: DelegatedRoute,
  input: z.infer<typeof specialistInputSchema>,
  task: LauncherTask,
): Promise<z.infer<typeof specialistOutputSchema>> {
  switch (route) {
    case "company_context":
      return await task.tools.marketing_os_company_context_builder(input);
    case "market_signal":
      return await task.tools.marketing_os_market_signal(input);
    case "icp":
      return await task.tools.marketing_os_icp(input);
    case "audience_segmentation":
      return await task.tools.marketing_os_audience_segmentation(input);
    case "messaging":
      return await task.tools.marketing_os_messaging(input);
    case "branding_pitch_deck":
      return await task.tools.marketing_os_branding_pitch_deck(input);
    case "social_monitoring_content":
      return await task.tools.marketing_os_social_monitoring_content(input);
    case "campaigns_paid_media":
      return await task.tools.marketing_os_campaigns_paid_media(input);
  }
}

export default agent({
  identifier: "guild_marketing_os_launcher",
  description:
    "Routes draft-only Marketing OS work to an explicit suite allowlist, returns complete specialist artifacts, and fails safely when context or a required package is unavailable.",
  inputSchema,
  outputSchema,
  tools,
  run,
});
