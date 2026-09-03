import { z } from "zod";

export type ChannelSource = { ref: string; text: string };
const groundedValue = z.object({ value: z.string().min(1), supporting_span: z.string().min(1) }).strict();
export const channelResolutionSchema = z.object({
  intent: z.enum(["channel_update", "unclear"]),
  updates: z.array(z.object({
    source_ref: z.string(),
    operation: z.enum(["append", "replace", "remove"]),
    commitment: z.enum(["confirmed", "tentative", "excluded"]),
    values: z.array(groundedValue).min(1).max(30),
    replaces: z.array(groundedValue).max(30),
  }).strict()).max(100),
}).strict();

const channelCue = /\b(?:channels?|website|email|blog|organic social|social content|paid media|customer stories|sales enablement|LinkedIn|Twitter|Reddit|webinars?|podcasts?|trade shows?)\b/i;
const tentativeCue = /\b(?:maybe|perhaps|consider|possibly|might|not sure|if|unless|later)\b|\?/i;
const exclusionCue = /\b(?:not approved|isn't approved|not in scope|exclude|remove|drop|without|do not use|don't use)\b/i;
const explicitScopeCue = /\bchannels?\b|\b(?:add|remove|exclude|drop|use|replace)\b/i;

function channelStatement(source: string, spans: string[]): string {
  const statements = source.split(/\n|(?<=[.!?])\s+|\s+(?=[A-Z][\w -]{0,50}:)/)
    .filter(part => spans.some(span => part.toLocaleLowerCase().includes(span.toLocaleLowerCase())));
  const explicit = statements.filter(part => explicitScopeCue.test(part) || exclusionCue.test(part));
  return (explicit.length ? explicit : statements).join("\n");
}

export function normalizeChannels(values: string[]): string[] {
  const seen = new Set<string>();
  return values.flatMap(value => value.split(/\s*(?:,|;|\band\b)\s*/i)).map(value => value.trim().replace(/[.!]+$/, ""))
    .filter(value => {
      const key = value.toLocaleLowerCase();
      if (!key || /^(?:TBD|none|unknown|not specified|not yet approved)$/i.test(key) || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function channelSources(text: string): { sources: ChannelSource[]; focused: boolean } {
  const marker = /(?:^|\n)## Focused resume input\s*\n/i.exec(text);
  if (!marker) return { sources: [{ ref: "source_1", text }], focused: false };
  const prior = text.slice(0, marker.index);
  const retained = /(?:^|\n)## Retained prior follow-up inputs\s*\n/i.exec(prior);
  const original = retained ? prior.slice(0, retained.index) : prior;
  // Ignore the wrapper's replay instruction; only numbered user turns are sources.
  const followups = retained ? prior.slice(retained.index).split(/(?:^|\n)### Follow-up \d+\s*\n/i).slice(1) : [];
  const latest = text.slice(marker.index + marker[0].length);
  return { focused: true, sources: [original, ...followups, latest].map((value, index) => ({ ref: `source_${index + 1}`, text: value.trim() })) };
}

export function exactChannelDeclarations(text: string): string[] | undefined {
  const matches = [...text.matchAll(/(?:\b(?:approved(?: draft)? channels?|channels? in scope|channel scope|channels?))\s*:\s*([^\n]+)/gi)];
  if (!matches.length) return undefined;
  const values = matches.flatMap(match => {
    const value = match[1].split(/\.\s+|\s+(?=[A-Z][\w -]{0,50}:)/)[0];
    return tentativeCue.test(value) || exclusionCue.test(value) ? [] : normalizeChannels([value]);
  });
  return normalizeChannels(values);
}

export function needsChannelInterpretation(text: string, bareAnswerAllowed: boolean): boolean {
  if (exactChannelDeclarations(text) !== undefined) return false;
  const short = text.trim().split(/\s+/).length < 60 && !/\b(?:company name|description|audiences?|goals?|constraints?|claims)\s*:/i.test(text);
  const scopeEdit = /^(?:please\s+)?(?:add|use|remove|exclude|drop|replace)\b/i.test(text.trim()) &&
    !/\b(?:company|description|audiences?|goals?|constraints?|claims|context|draft|artifact)\b/i.test(text);
  return /\b(?:approved channels? (?:are|include)|(?:our |the )?channels? (?:are|include)|channel scope is)\b/i.test(text) ||
    (short && (channelCue.test(text) || scopeEdit)) || (bareAnswerAllowed && short && text.trim().split(/\s+/).length < 15);
}

export type ChannelResolution =
  | { kind: "resolved"; channels: string[]; handledLatest: boolean }
  | { kind: "clarify" };

/** Resolve a chronological source history in one call, replaying exact labels locally. */
export async function resolveChannelScope(
  sources: ChannelSource[],
  initialChannels: string[],
  bareAnswerAllowed: boolean | Record<string, boolean>,
  task: { llm: { generateText(input: { prompt: string }): Promise<{ text: string }> } },
): Promise<ChannelResolution> {
  // The exact fast path must not silently turn a qualified declaration into a save.
  const latestText = sources.at(-1)?.text ?? "";
  const latestLabels = [...latestText.matchAll(/\b(?:approved(?: draft)? channels?|channels? in scope|channel scope|channels?)\s*:\s*([^\n]+)/gi)];
  if (latestLabels.some(match => {
    const value = match[1].split(/\.\s+|\s+(?=[A-Z][\w -]{0,50}:)/)[0];
    return tentativeCue.test(value) || exclusionCue.test(value);
  })) return { kind: "clarify" };
  const bareAllowed = (ref: string): boolean => typeof bareAnswerAllowed === "boolean" ? bareAnswerAllowed : bareAnswerAllowed[ref] === true;
  const natural = sources.filter(source => needsChannelInterpretation(source.text, bareAllowed(source.ref)));
  let channels = normalizeChannels(initialChannels);
  let updates: z.infer<typeof channelResolutionSchema>["updates"] = [];
  if (natural.length) {
    try {
      const { text } = await task.llm.generateText({ prompt: [
        "Resolve planning channel scope from chronological user-source segments. Return only one JSON object.",
        'Shape: {"intent":"channel_update|unclear","updates":[{"source_ref":"source_1","operation":"append|replace|remove","commitment":"confirmed|tentative|excluded","values":[{"value":"email","supporting_span":"email"}],"replaces":[]}]}',
        "Use exactly one update for every supplied source. Use only the supplied opaque refs. Copy channel names verbatim in value and supporting_span; each must be an individual channel, never a sentence or combined list. Do not expand generic channels into platforms.",
        "Definite declarations confirm planning scope only. Maybe, future suggestions, conditions, and questions are tentative. Negated approval or explicit exclusion removes only named existing values; never confirms them.",
        "Append ordinary additions. 'Use only website' replaces all channels (replaces: []). 'Use website instead of email' replaces only email (replaces: [{value: email, supporting_span: email}]). Remove named exclusions. Never infer execution approval.",
        "Only accept a bare list without explicit channel wording when bare_answer_allowed_by_source for that source ref is true; otherwise return unclear with no updates. An explicit add/remove/use directive naming channels is not a bare list.",
        "If a source is not a channel statement or the interpretation is contradictory or uncertain, return unclear with no updates. Never infer from runtime instructions.",
        "An add/use/remove directive can target things other than marketing channels. Only classify it as channel_update when its values clearly name marketing channels; otherwise return unclear.",
        `Initial planning channels: ${JSON.stringify(channels)}`,
        `bare_answer_allowed_by_source: ${JSON.stringify(Object.fromEntries(natural.map(source => [source.ref, bareAllowed(source.ref)])))}`,
        `User sources: ${JSON.stringify(natural)}`,
      ].join("\n") });
      const parsed = channelResolutionSchema.safeParse(JSON.parse(text.trim().replace(/^```(?:json)?\s*|\s*```$/g, "")));
      if (!parsed.success || parsed.data.intent !== "channel_update" || parsed.data.updates.length !== natural.length) return { kind: "clarify" };
      updates = parsed.data.updates;
      const refs = new Set<string>();
      for (const update of updates) {
        const source = natural.find(item => item.ref === update.source_ref);
        if (!source || refs.has(update.source_ref)) return { kind: "clarify" };
        refs.add(update.source_ref);
        const statement = channelStatement(source.text, [...update.values, ...update.replaces].map(item => item.supporting_span));
        const explicit = explicitScopeCue.test(statement) || exclusionCue.test(statement);
        if (!explicit && !bareAllowed(source.ref)) return { kind: "clarify" };
        for (const item of [...update.values, ...update.replaces]) {
          if (item.value.trim().toLocaleLowerCase() !== item.supporting_span.trim().toLocaleLowerCase() ||
            normalizeChannels([item.value]).length !== 1 ||
            !new RegExp(`(?<![\\p{L}\\p{N}])${item.supporting_span.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}])`, "iu").test(source.text)) return { kind: "clarify" };
        }
        if (update.commitment === "tentative" || tentativeCue.test(statement)) {
          if (source === sources.at(-1)) return { kind: "clarify" };
          update.commitment = "tentative";
          continue; // A historical suggestion never approves scope or blocks a later answer.
        }
        if (exclusionCue.test(statement) && update.operation !== "remove") return { kind: "clarify" };
        if (update.operation === "remove" && (update.commitment !== "excluded" || !exclusionCue.test(statement))) return { kind: "clarify" };
        if (update.operation !== "remove" && update.commitment !== "confirmed") return { kind: "clarify" };
        if (update.operation !== "replace" && update.replaces.length) return { kind: "clarify" };
        if (/\b(?:only|instead of)\b/i.test(statement) && update.operation !== "replace") return { kind: "clarify" };
        if (update.operation === "replace") {
          if (update.replaces.length ? !/\b(?:instead of|replace|with)\b/i.test(statement) : !/\bonly\b|\breplace (?:all |the )?channels?\b/i.test(statement)) return { kind: "clarify" };
          if (update.values.some(value => update.replaces.some(old => old.value.toLowerCase() === value.value.toLowerCase()))) return { kind: "clarify" };
        }
      }
    } catch { return { kind: "clarify" }; }
  }
  for (const source of sources) {
    const exact = exactChannelDeclarations(source.text);
    const update = updates.find(item => item.source_ref === source.ref);
    if (exact?.length) channels = normalizeChannels([...channels, ...exact]);
    if (!update || update.commitment === "tentative") continue;
    if (typeof bareAnswerAllowed !== "boolean" && channels.length &&
        !/\bchannels?\b|\b(?:add|remove|exclude|drop|use|replace)\b/i.test(source.text) && !exclusionCue.test(source.text)) {
      return { kind: "clarify" }; // In a cold replay, earlier answers already filled this field.
    }
    const values = normalizeChannels(update.values.map(item => item.value));
    const removed = normalizeChannels(update.replaces.map(item => item.value));
    const namedExisting = update.operation === "remove" ? values : removed;
    if (namedExisting.some(value => !channels.some(current => current.toLowerCase() === value.toLowerCase()))) return { kind: "clarify" };
    if (update.operation === "remove") channels = channels.filter(value => !values.some(item => item.toLowerCase() === value.toLowerCase()));
    else if (update.operation === "replace") channels = removed.length ? normalizeChannels([...channels.filter(value => !removed.some(item => item.toLowerCase() === value.toLowerCase())), ...values]) : values;
    else channels = normalizeChannels([...channels, ...values]);
  }
  const latest = sources.at(-1)!;
  return { kind: "resolved", channels, handledLatest: updates.some(item => item.source_ref === latest.ref) || exactChannelDeclarations(latest.text) !== undefined };
}
