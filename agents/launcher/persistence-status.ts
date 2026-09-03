import { routeConfig, type DelegatedRoute } from "./launcher-core.js";
import type { LauncherAgentState } from "./launcher-state.js";

// Package-local: Launcher reads its cockpit, never a fresh Builder task's state.
export function isPersistenceStatusQuestion(text: string): boolean {
  const value = text.trim();
  if (/(?:\b(?:and|then|also)\s+|[.!?;]\s*)(?:please\s+)?(?:save|approve|publish|edit|remove|change)\b/i.test(value)) return false;
  if (/\b(?:show|list|read|open)\b[\s\S]*\bapproved (?:claims|facts|channels|draft|artifact)\b/i.test(value) && !/\b(?:whether|if|status)\b/i.test(value)) return false;
  return /^(?:please\s+)?(?:tell me|show me|report|confirm)\b[\s\S]{0,100}\b(?:saved|persisted|approved|published|persistence|save status|approval status)\b/i.test(value) ||
    /^(?:is|was|did|has|have|where|which|what)\b[\s\S]{0,100}\b(?:saved|persisted|approved|published|persistence|save status|approval status)\b/i.test(value) ||
    /^did\b[\s\S]{0,80}\b(?:save|persist|approve|publish)\b/i.test(value) ||
    /^(?:saved|persisted|approved|published)\s*\?$/i.test(value);
}

const workstreamNames: Record<DelegatedRoute, RegExp> = {
  company_context: /\b(?:company context|builder)\b/i,
  market_signal: /\bmarket signal\b/i,
  icp: /\b(?:ICP|ideal customer)\b/i,
  audience_segmentation: /\baudience segmentation\b/i,
  messaging: /\bmessaging\b/i,
  branding_pitch_deck: /\b(?:branding|pitch deck)\b/i,
  social_monitoring_content: /\bsocial\b/i,
  campaigns_paid_media: /\b(?:campaigns?|paid media)\b/i,
};

export function renderPersistenceStatus(text: string, state: LauncherAgentState, specialistAlreadyCalled = false): string {
  const lines = ["# Marketing OS Save Status", ""];
  const ids: string[] = text.match(/\b[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}\b/gi) ?? [];
  const revisions = [...text.matchAll(/\brevision\s+(\d+)\b/gi)].map(match => Number(match[1]));
  const routes = (Object.keys(workstreamNames) as DelegatedRoute[]).filter(route => workstreamNames[route].test(text));
  const last = state.runs.find(run => run.run_id === state.last_run_id);
  let candidates = state.artifacts.filter(artifact =>
    (!ids.length || ids.includes(artifact.artifact_id)) &&
    (!routes.length || routes.includes(artifact.artifact_type as DelegatedRoute)) &&
    (!revisions.length || revisions.includes(artifact.revision)));
  if (routes.length === 1 && !ids.length && !revisions.length) {
    const workstream = state.workstreams.find(stream => stream.specialist === routeConfig[routes[0]!].displayName);
    if (workstream?.latest_artifact_id) candidates = candidates.filter(artifact =>
      artifact.artifact_id === workstream.latest_artifact_id && artifact.revision === workstream.latest_artifact_revision);
  }
  const explicitTarget = ids.length > 0 || routes.length > 0 || revisions.length > 0;
  if (!explicitTarget && last) {
    candidates = candidates.filter(artifact => artifact.artifact_id === last.artifact_id && artifact.revision === last.artifact_revision);
  } else if (!revisions.length) {
    candidates = candidates.filter(artifact => !candidates.some(other => other.artifact_id === artifact.artifact_id && other.revision > artifact.revision));
  }
  if (ids.length > 1 || routes.length > 1 || revisions.length > 1 || candidates.length > 1) {
    lines.push("Which saved artifact do you mean? Name its workstream or artifact ID and revision.",
      ...candidates.slice(0, 8).map(artifact => `- ${artifact.artifact_type}: ${artifact.artifact_id}, revision ${artifact.revision} (${artifact.status})`));
  } else if (!candidates.length) {
    lines.push(!state.artifacts.length && !state.runs.length
      ? "No draft artifact is recorded in this Chat."
      : "No matching saved artifact can be confirmed from this Chat's records. Specify a stored artifact ID and revision.");
  } else {
    const artifact = candidates[0]!;
    const run = state.runs.find(run => run.artifact_id === artifact.artifact_id && run.artifact_revision === artifact.revision);
    const name = routeConfig[artifact.artifact_type as DelegatedRoute]?.displayName ?? artifact.artifact_type;
    lines.push(`${name} revision ${artifact.revision} is saved in this Chat.`, `Artifact: ${artifact.artifact_id}, revision ${artifact.revision}.`);
    const approved = artifact.status === "approved" && artifact.approvals.length > 0;
    const inconsistent = (artifact.status === "approved" && !approved) || (run?.status === "approved" && !approved) || (approved && run && run.status !== "approved");
    lines.push(inconsistent ? "Approval records are inconsistent; approval cannot be confirmed."
      : approved ? "Approval: this revision is approved."
        : artifact.status === "ready_for_review" ? "Approval: awaiting approval."
          : `Approval: not approved; artifact status is ${artifact.status}.`);
  }
  lines.push(state.published_context_id
    ? `This Chat records an earlier Workspace Context publication receipt: ${state.published_context_id}. It does not establish that the latest artifact is published; workspace-wide publication has not been checked.`
    : "Publication to Workspace Context is not recorded by this Chat; workspace-wide publication has not been checked.");
  lines.push("", specialistAlreadyCalled
    ? "No draft, approval, or workflow changed. No further specialist or external action was started."
    : "No draft, approval, or workflow changed. No specialist or external action was started.");
  return lines.join("\n");
}

/** Only recognizes Builder's control headings; never trusts or imports their prose. */
export function builderControlReply(text: string): "clarification" | "status" | undefined {
  if (/^# Company Context (?:Clarification|Approval Check)\s*(?:\n|$)/.test(text.trim())) return "clarification";
  if (/^# Company Context Status\s*(?:\n|$)/.test(text.trim())) return "status";
  return undefined;
}
