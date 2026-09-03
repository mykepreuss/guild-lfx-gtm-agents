type ArtifactSnapshot = {
  persistenceState: {
    saved_to_context_artifacts: boolean;
    context_artifact_references?: string[];
  };
};

type PersistenceState = {
  lastOutput?: ArtifactSnapshot;
  approvedOutput?: ArtifactSnapshot;
  durableContextArtifactId?: string;
  durableContextArtifactRevision?: number;
  durableContextArtifactStatus?: string;
  workspaceContextStatus?: string;
  workspaceContextId?: string;
  durablePublishedContextRevision?: number;
};

export function isPersistenceStatusQuestion(text: string): boolean {
  const value = text.trim();
  // A read may mention saving or approval, but must not also request a write.
  if (/\b(?:and|then|also)\s+(?:please\s+)?(?:save|approve|publish|edit|remove|change)\b/i.test(value)) return false;
  if (/\b(?:show|list|read|open)\b[\s\S]*\bapproved (?:claims|facts|channels|draft|artifact)\b/i.test(value) && !/\b(?:whether|if|status)\b/i.test(value)) return false;
  return /^(?:please\s+)?(?:tell me|show me|report|confirm)\b[\s\S]{0,100}\b(?:saved|persisted|approved|published|persistence|save status|approval status)\b/i.test(value) ||
    /^(?:is|was|did|has|have|where|which|what)\b[\s\S]{0,100}\b(?:saved|persisted|approved|published|persistence|save status|approval status)\b/i.test(value) ||
    /^did\b[\s\S]{0,80}\b(?:save|persist|approve|publish)\b/i.test(value) ||
    /^(?:saved|persisted|approved|published)\s*\?$/i.test(value);
}

export function renderPersistenceStatus(state: PersistenceState): string {
  const draft = state.lastOutput ?? state.approvedOutput;
  const id = state.durableContextArtifactId;
  const revision = state.durableContextArtifactRevision;
  const reference = id && revision ? `${id}:${revision}` : undefined;
  const retained = Boolean(reference && draft?.persistenceState.saved_to_context_artifacts &&
    draft.persistenceState.context_artifact_references?.includes(reference));
  const approved = retained && state.durableContextArtifactStatus === "approved" &&
    Boolean(state.approvedOutput?.persistenceState.context_artifact_references?.includes(reference!));
  const inconsistent = (Boolean(state.approvedOutput) || state.durableContextArtifactStatus === "approved") && !approved;
  const lines = ["# Company Context Status", ""];
  if (!draft && !id && !revision) {
    lines.push("No Company Context draft is recorded in this Chat.");
  } else if (!retained || inconsistent) {
    lines.push("Company Context persistence or approval records are incomplete or inconsistent; I cannot confirm that the current revision is saved and approved.");
  } else {
    lines.push(`Company Context revision ${revision} is saved in this Chat.`,
      approved ? "Approval: this revision is approved." :
        state.durableContextArtifactStatus === "blocked" ? "Approval: not approved; this draft is blocked." :
          state.durableContextArtifactStatus === "draft" ? "Approval: not approved; this draft still needs input." :
            "Approval: awaiting approval.");
  }
  if (reference) lines.push(`Artifact: ${id}, revision ${revision}.`);
  if (state.workspaceContextStatus === "published" && state.workspaceContextId) {
    lines.push(`This Chat records an earlier Workspace Context publication receipt: ${state.workspaceContextId}${state.durablePublishedContextRevision ? ` (recorded context revision ${state.durablePublishedContextRevision})` : ""}.`,
      "That receipt does not establish that the latest draft is published or that the workspace still uses it.");
  } else {
    lines.push("Publication to Workspace Context is not recorded by this Chat; workspace-wide publication has not been checked.");
  }
  if (approved) lines.push("Next: return to the canonical Launcher Chat for the separate confirmation and Guild Context-screen publication steps.");
  lines.push("", "No draft or approval was changed.");
  return lines.join("\n");
}
