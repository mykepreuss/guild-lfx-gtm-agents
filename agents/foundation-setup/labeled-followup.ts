import { builderSemanticActionSchema, type BuilderSemanticAction } from "./conversation-intent.js";

const labels = {
  "company name": "company_name", "brand name": "company_name", "organization name": "company_name",
  "approved company description": "description", "approved description": "description", "company description": "description", description: "description",
  "primary audiences": "audiences", "primary audience": "audiences", audiences: "audiences", audience: "audiences",
  "current marketing goal": "goals", "marketing goal": "goals", "current goals": "goals", goals: "goals",
  "approved claims": "approved_claims", "approved facts": "approved_claims", "claims approved for reuse": "approved_claims",
  "anything not approved for reuse": "do_not_use_claims",
  "important constraints": "constraints", constraints: "constraints",
  "channels in scope": "channels", "approved draft channels": "channels", "approved channels": "channels", "channel scope": "channels", channels: "channels",
} as const;

type Field = (typeof labels)[keyof typeof labels];

/** Exact additive labels are deterministic; mixed prose/edits use the existing intent resolver. */
export function labeledContextTurn(text: string): {
  fields: Field[];
  standalone: boolean;
  action?: BuilderSemanticAction;
} {
  const pattern = new RegExp(`(?:^|\\n|[.;]\\s+)\\s*(?:[-*]\\s+)?(${Object.keys(labels).sort((a,b) => b.length-a.length).join("|")})\\s*:\\s*`, "gi");
  const matches = [...text.matchAll(pattern)];
  const fields = matches.map(match => labels[match[1]!.toLowerCase() as keyof typeof labels]);
  // A packet identifying and describing a company keeps the established source
  // ingestion path. A few supplemental labels must not replace that source.
  const standalone = fields.includes("company_name") && fields.includes("description");
  const result: { fields: Field[]; standalone: boolean; action?: BuilderSemanticAction } = { fields, standalone };
  if (standalone || !matches.length || text.slice(0, matches[0]!.index).trim()) return result;
  const updates = matches.flatMap((match, index) => {
    const field = fields[index]!;
    const value = text.slice(match.index! + match[0].length, matches[index + 1]?.index ?? text.length).trim().replace(/[.;]$/, "").trim();
    return [{ field, operation: "append" as const, supporting_span: value }];
  });
  if (new Set(fields).size !== fields.length || updates.some(update =>
    !update.supporting_span || /\n|\bchannels?\s+(?:are|include)\b|\b(?:replace|remove|delete|instead|change|correct|maybe|perhaps|only|not sure)\b|\?/i.test(update.supporting_span))) return result;
  const parsed = builderSemanticActionSchema.safeParse({
    intent: "provide_or_answer_context", candidate_refs: ["draft_1"], approval_commitment: "none",
    field_updates: updates,
  });
  if (parsed.success) result.action = parsed.data;
  return result;
}
