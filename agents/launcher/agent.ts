"use agent";

import {
  agent,
  guildAgentTool,
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
  routeConfig,
  safeError,
  specialistInput,
  specialistInputSchema,
  specialistOutputSchema,
  suiteInstallOrder,
  validateSpecialistOutput,
  type DelegatedRoute,
} from "./launcher-core.js";

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
};

type Tools = typeof tools;

async function run(
  input: z.infer<typeof inputSchema>,
  task: Task<Tools>,
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

  const delegatedInput = specialistInput(userText, context.contextRevision, route);
  let firstAttempt: z.infer<typeof specialistOutputSchema>;
  try {
    firstAttempt = await invokeSpecialist(route, delegatedInput, task);
  } catch (error) {
    return {
      type: "text",
      text: renderBlocked(`Specialist failed: ${safeError(error)}`),
    };
  }

  const firstText = extractSpecialistText(firstAttempt);
  if (!firstText) {
    return {
      type: "text",
      text: renderBlocked("Specialist returned an empty or unsupported output."),
    };
  }

  const firstErrors = validateSpecialistOutput(firstText, {
    allowContextPublicationPhrase: route === "company_context",
  });
  if (firstErrors.length === 0) {
    return {
      type: "text",
      text: renderDelegatedResult(config.displayName, firstText),
    };
  }

  if (!onlyFormatErrors(firstErrors)) {
    return {
      type: "text",
      text: renderBlocked(
        `Specialist output failed safety validation: ${firstErrors.join("; ")}`,
      ),
    };
  }

  const repairInput = specialistInput(
    [
      "FORMAT REPAIR ONLY.",
      "Preserve the substantive content from the prior attempt; do not add new claims.",
      `Repair these validation errors: ${firstErrors.join("; ")}`,
      "Return the complete corrected artifact with the seven required headings, an explicit evidence mode, and a draft-only safety envelope.",
      "",
      "Prior attempt:",
      firstText,
    ].join("\n"),
    context.contextRevision,
    route,
  );

  let repairedAttempt: z.infer<typeof specialistOutputSchema>;
  try {
    repairedAttempt = await invokeSpecialist(route, repairInput, task);
  } catch (error) {
    return {
      type: "text",
      text: renderBlocked(`Format repair failed: ${safeError(error)}`),
    };
  }

  const repairedText = extractSpecialistText(repairedAttempt);
  const repairedErrors = repairedText
    ? validateSpecialistOutput(repairedText, {
        allowContextPublicationPhrase: route === "company_context",
      })
    : ["Empty repair output."];
  if (!repairedText || repairedErrors.length > 0) {
    return {
      type: "text",
      text: renderBlocked(
        `Specialist format repair failed validation: ${repairedErrors.join("; ")}`,
      ),
    };
  }

  return {
    type: "text",
    text: renderDelegatedResult(config.displayName, repairedText),
  };
}

async function invokeSpecialist(
  route: DelegatedRoute,
  input: z.infer<typeof specialistInputSchema>,
  task: Task<Tools>,
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
