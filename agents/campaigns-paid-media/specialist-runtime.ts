import {
  agent,
  noTools,
  type Task,
} from "@guildai/agents-sdk";
import { z } from "zod";

const inputSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

const outputSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

const requiredHeadings = [
  "## Consumed Context",
  "## Produced Artifact",
  "## Assumptions And Missing Evidence",
  "## Approval Gate",
  "## AEO / AI-Readiness Contribution",
  "## Status Payload",
  "## Downstream Handoff",
] as const;

const evidenceModes = [
  "source_supplied",
  "connected_read_only",
  "live_monitoring",
] as const;

const approvedHipaaConstraintPattern =
  /\b[A-Z][A-Za-z0-9&.'’ -]{0,120} may not be HIPAA compliant,\s+and customers\s+should not provide Protected Health Information\s*\/\s*PHI\s+through the platform\./gi;

const sensitiveGeneratedClaimPattern =
  /\$[0-9]|\b(?:funding|ARR|valuation|SOC\s*2|ISO(?:\/IEC)?\s*27001|uptime|faster|trusted by|leading|guarantee|guaranteed)\b|\b(?:secure|standards[- ]compliant|secure and compliant)\b|\b[0-9]+(?:\.[0-9]+)?\s*(?:%|x)\b|\b[0-9][0-9.,]*\s*(?:m|million|k|thousand)?\s+users\b|\b[0-9][0-9.,]*\s+countries\b/i;

const unsafeGeneratedLinePatterns: Array<[RegExp, string]> = [
  [/\b(?:published|scheduled|activated|synced|installed|configured) successfully\b/i, "external-action completion"],
  [/\bautomatically (?:publish|schedule|pause|scale|sync|activate)\b/i, "automatic external action"],
  [/\b(?:eliminate|eliminates|eliminated)\b/i, "absolute eliminate claim"],
  [/\binstantly\b/i, "instant-result claim"],
  [/\bproduction-ready\b/i, "production-readiness claim"],
  [/\bhigh-converting\b/i, "conversion-performance claim"],
  [/\bhigh-performance\b/i, "performance claim"],
  [/\bscales? securely\b/i, "security-and-scale claim"],
  [/\bwithout compromises?\b/i, "absolute no-compromise claim"],
  [/\btrusted by\b/i, "trust/scale claim"],
  [/\bbest-in-class\b|\bmarket[- ]leading\b|\bindustry[- ]leading\b/i, "ranking claim"],
  [/\bcontinuous experiments?\b/i, "continuous-execution claim"],
  [/\bis not HIPAA compliant\b/i, "incorrectly strengthened HIPAA claim"],
  [/\bis HIPAA compliant\b/i, "unsupported HIPAA compliance claim"],
  [/\bSOC\s*2(?:\s+Type\s+II)?\s+compliance\b/i, "compliance claim"],
  [/\bscales? safely\b/i, "safety-and-scale claim"],
  [
    sensitiveGeneratedClaimPattern,
    "sensitive pricing, proof, scale, trust, or performance claim",
  ],
];

const statusPayloadSchema = z.object({
  evidence_mode: z.enum(evidenceModes),
  observed_at: z.string().nullable(),
  source_coverage: z.array(z.string()),
  coverage_limitations: z.array(z.string()),
  status: z.enum(["needs_input", "ready_for_review", "blocked"]),
  safety: z.object({
    action_mode: z.literal("draft_only"),
    external_mutation_requested: z.literal(false),
    blocked_actions: z.array(z.string()),
    unsupported_claims: z.array(z.string()),
    evidence_gaps: z.array(z.string()),
  }),
});

type Input = z.infer<typeof inputSchema>;
type Output = z.infer<typeof outputSchema>;

type ValidationIssue = {
  kind: "format" | "evidence" | "safety";
  message: string;
};

export type SpecialistValidation = {
  valid: boolean;
  issues: ValidationIssue[];
  formatOnly: boolean;
};

type SpecialistValidationOptions = {
  expectedHipaaConstraint?: string;
};

export type ValidatedSpecialistConfig = {
  identifier: string;
  description: string;
  systemPrompt: string;
};

const deterministicContract = `
Deterministic output contract:
- Return exactly one Markdown artifact and no preamble.
- Use every required shared heading exactly once and in the specified order.
- Under Assumptions And Missing Evidence, write exactly one Evidence mode label using source_supplied, connected_read_only, or live_monitoring.
- Under Status Payload, return one JSON code fence with this exact shape:
  {
    "evidence_mode": "source_supplied | connected_read_only | live_monitoring",
    "observed_at": null,
    "source_coverage": ["specific sources actually inspected"],
    "coverage_limitations": ["material limitations"],
    "status": "needs_input | ready_for_review | blocked",
    "safety": {
      "action_mode": "draft_only",
      "external_mutation_requested": false,
      "blocked_actions": ["actions not performed"],
      "unsupported_claims": ["claims withheld or needing evidence"],
      "evidence_gaps": ["missing evidence"]
    }
  }
- source_coverage and coverage_limitations are always arrays.
- source_supplied may use observed_at: null. connected_read_only and live_monitoring require a non-empty observed_at value plus specific inspected-source coverage.
- Do not turn a source-supplied or workspace-context statement into an approved public claim merely because it is present. Pricing, proof metrics, scale, funding, revenue, compliance, security, privacy, guarantees, rankings, and performance claims require an explicit evidence label and approval state.
- Use only facts present in the current input. Never fill gaps from model background knowledge, even for a well-known company or product. A company or product name alone does not authorize product, capability, audience, customer, market, or technical assertions.
- A fact labeled source_supplied_review_required, secondary_estimate, blocked, withheld, unknown, or TBD may appear only as a limitation, evidence gap, unsupported claim, or approval requirement. It must not appear as reusable language, positioning, a benefit, a recommendation premise, a segment fact, a draft post, a campaign claim, or a pitch assertion under Produced Artifact.
- A dollar amount, percentage, multiplier, customer/logo, uptime, certification, funding, valuation, scale, security, or performance fact may appear under Produced Artifact only when that same line clearly labels it approved_reusable or source_supplied_review_required and states the required evidence or owner review. Otherwise replace it with a labeled TBD or proof request.
- If removing review-required or missing facts leaves too little substance for the requested artifact, return a useful needs_input packet with focused questions and labeled placeholders. Do not compensate by drafting from general knowledge.
- Preserve material legal and compliance nuance exactly. In particular, "may not be HIPAA compliant" must never become "is not HIPAA compliant" or "is HIPAA compliant."
- Omit HIPAA, PHI, and other legal or compliance constraints when they are not material to the user's requested artifact. If the input explicitly supplies an exact approved constraint for reuse, follow that instruction exactly and do not add paraphrases.
- Avoid absolute marketing language such as eliminates, instantly, guaranteed, seamless, production-ready, high-converting, high-performance, best-in-class, leading, trusted by, secure, compliant, or without compromise unless that exact line labels the statement as source-supplied and requiring approval.
- Before returning the artifact, inspect every Produced Artifact sentence. Remove or replace any ungrounded or review-required assertion with a labeled TBD; do not merely explain the problem elsewhere in the packet.
- Never claim an external action or live observation occurred.
`.trim();

export function createValidatedSpecialistAgent(
  config: ValidatedSpecialistConfig,
) {
  return agent({
    identifier: config.identifier,
    description: config.description,
    inputSchema,
    outputSchema,
    tools: noTools,
    async run(input: Input, task: Task): Promise<Output> {
      const system = `${config.systemPrompt}\n\n${deterministicContract}`;
      const validationOptions = {
        expectedHipaaConstraint: extractExpectedHipaaConstraint(input.text),
      };
      const initial = await task.llm.generateText({
        system,
        prompt: input.text,
        stream: false,
      });
      const initialText = initial.text.trim();
      const initialValidation = validateSpecialistArtifact(
        initialText,
        validationOptions,
      );

      if (initialValidation.valid) {
        return { type: "text", text: initialText };
      }

      if (!initialValidation.formatOnly) {
        if (
          initialValidation.issues.every(
            (issue) => issue.kind === "safety",
          )
        ) {
          const redacted = redactUnsafeGeneratedLines(
            initialText,
            initialValidation.issues,
            validationOptions,
          );
          if (
            redacted.changed &&
            validateSpecialistArtifact(redacted.text, validationOptions).valid
          ) {
            return { type: "text", text: redacted.text };
          }
        }
        return {
          type: "text",
          text: renderBlockedArtifact(initialValidation.issues),
        };
      }

      const repair = await task.llm.generateText({
        system,
        prompt: buildFormatRepairPrompt(input.text, initialText, initialValidation.issues),
        stream: false,
      });
      const repairedText = repair.text.trim();
      const repairedValidation = validateSpecialistArtifact(
        repairedText,
        validationOptions,
      );
      if (repairedValidation.valid) {
        return { type: "text", text: repairedText };
      }

      return {
        type: "text",
        text: renderBlockedArtifact(repairedValidation.issues),
      };
    },
  });
}

export function validateSpecialistArtifact(
  text: string,
  options: SpecialistValidationOptions = {},
): SpecialistValidation {
  const issues: ValidationIssue[] = [];
  let previousIndex = -1;

  for (const heading of requiredHeadings) {
    const indexes = allIndexes(text, heading);
    if (indexes.length !== 1) {
      issues.push({
        kind: "format",
        message:
          indexes.length === 0
            ? `Missing required heading: ${heading}`
            : `Required heading appears ${indexes.length} times: ${heading}`,
      });
      continue;
    }
    if (indexes[0] < previousIndex) {
      issues.push({
        kind: "format",
        message: `Required heading is out of order: ${heading}`,
      });
    }
    previousIndex = indexes[0];
  }

  const evidenceSection = extractSection(
    text,
    "## Assumptions And Missing Evidence",
    "## Approval Gate",
  );
  const evidenceMatches = evidenceSection.match(
    /\b(?:source_supplied|connected_read_only|live_monitoring)\b/g,
  ) ?? [];
  if (evidenceMatches.length !== 1) {
    issues.push({
      kind: "format",
      message:
        "Assumptions And Missing Evidence must contain exactly one evidence mode.",
    });
  }

  const statusSection = extractSection(
    text,
    "## Status Payload",
    "## Downstream Handoff",
  );
  const statusJson = extractJsonFence(statusSection);
  let statusPayload: z.infer<typeof statusPayloadSchema> | undefined;
  if (statusJson === undefined) {
    issues.push({
      kind: "format",
      message: "Status Payload must contain one valid JSON code fence.",
    });
  } else {
    try {
      const parsed = statusPayloadSchema.safeParse(JSON.parse(statusJson));
      if (!parsed.success) {
        issues.push({
          kind: "format",
          message: `Status Payload does not match the contract: ${parsed.error.issues
            .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
            .join("; ")}`,
        });
      } else {
        statusPayload = parsed.data;
      }
    } catch {
      issues.push({
        kind: "format",
        message: "Status Payload JSON is malformed.",
      });
    }
  }

  if (
    statusPayload &&
    evidenceMatches.length === 1 &&
    statusPayload.evidence_mode !== evidenceMatches[0]
  ) {
    issues.push({
      kind: "evidence",
      message:
        "The narrative evidence mode and Status Payload evidence_mode do not match.",
    });
  }
  if (
    statusPayload &&
    statusPayload.evidence_mode !== "source_supplied" &&
    (!statusPayload.observed_at ||
      statusPayload.source_coverage.length === 0)
  ) {
    issues.push({
      kind: "evidence",
      message:
        "Connected or live evidence requires observed_at and inspected-source coverage.",
    });
  }

  const safetyNarrative = [
    extractSection(
      text,
      "## Produced Artifact",
      "## Assumptions And Missing Evidence",
    ),
    extractSection(text, "## Approval Gate", "## AEO / AI-Readiness Contribution"),
    extractSection(
      text,
      "## AEO / AI-Readiness Contribution",
      "## Status Payload",
    ),
    extractSection(text, "## Downstream Handoff", "\u0000"),
  ].join("\n");
  issues.push(...validateProducedArtifactSafety(safetyNarrative));
  issues.push(
    ...validateHipaaConstraintLanguage(
      safetyNarrative,
      options.expectedHipaaConstraint,
    ),
  );
  if (
    /\b(?:is|was|assumed to)\s+(?:not|never)\s+(?:be\s+)?HIPAA compliant\b/i.test(
      safetyNarrative,
    )
  ) {
    issues.push({
      kind: "safety",
      message:
        'The HIPAA constraint was strengthened or paraphrased. Preserve only the exact "may not be HIPAA compliant" wording.',
    });
  }

  const formatOnly =
    issues.length > 0 && issues.every((issue) => issue.kind === "format");
  return {
    valid: issues.length === 0,
    issues,
    formatOnly,
  };
}

export function redactUnsafeGeneratedLines(
  text: string,
  issues: ValidationIssue[],
  options: SpecialistValidationOptions = {},
): { changed: boolean; text: string } {
  const lines = text.split("\n");
  const redactedExcerpts: string[] = [];
  let inspectSection = false;
  const redactedLines = lines.map((line) => {
    const trimmed = line.trim();
    if ((requiredHeadings as readonly string[]).includes(trimmed)) {
      inspectSection = [
        "## Produced Artifact",
        "## Approval Gate",
        "## AEO / AI-Readiness Contribution",
        "## Downstream Handoff",
      ].includes(trimmed);
    }
    const strengthensHipaa =
      /\b(?:is|was|assumed to)\s+(?:not|never)\s+(?:be\s+)?HIPAA compliant\b/i.test(
        trimmed,
      );
    const paraphrasesHipaa = hasDisallowedHipaaLanguage(
      trimmed,
      options.expectedHipaaConstraint,
    );
    const sentenceParts = trimmed.split(
      /(?<=[.!?])\s+(?=[A-Z])/,
    );
    const unsafe =
      inspectSection &&
      (strengthensHipaa ||
        paraphrasesHipaa ||
        sentenceParts.some(
          (sentence) =>
            !isExplicitlyQualifiedLine(sentence) &&
            unsafeGeneratedLinePatterns.some(([pattern]) =>
              pattern.test(sentence),
            ),
        ));
    if (!unsafe) return line;

    redactedExcerpts.push(trimmed.replace(/\s+/g, " ").slice(0, 180));
    const indentation = line.match(/^\s*/)?.[0] ?? "";
    return `${indentation}- TBD — This generated line was withheld by deterministic safety validation; source evidence and owner approval are required.`;
  });

  if (redactedExcerpts.length === 0) {
    return { changed: false, text };
  }

  let redactedText = redactedLines.join("\n");
  const statusSection = extractSection(
    redactedText,
    "## Status Payload",
    "## Downstream Handoff",
  );
  const statusJson = extractJsonFence(statusSection);
  if (statusJson === undefined) {
    return { changed: false, text };
  }

  try {
    const parsed = statusPayloadSchema.parse(JSON.parse(statusJson));
    const limitation =
      `Deterministic safety validation withheld ${redactedExcerpts.length} generated line(s) before review.`;
    const revisedPayload = {
      ...parsed,
      coverage_limitations: [
        ...parsed.coverage_limitations,
        limitation,
      ],
      safety: {
        ...parsed.safety,
        unsupported_claims: [
          ...parsed.safety.unsupported_claims,
          ...redactedExcerpts.map(
            (excerpt) => `Withheld generated line: ${excerpt}`,
          ),
        ],
        evidence_gaps: [
          ...parsed.safety.evidence_gaps,
          ...issues.map((issue) => issue.message),
        ],
      },
    };
    redactedText = redactedText.replace(
      statusJson,
      JSON.stringify(revisedPayload, null, 2),
    );
    redactedText = redactedText.replace(
      /(## Assumptions And Missing Evidence[\s\S]*?Evidence mode:\s*(?:source_supplied|connected_read_only|live_monitoring)[^\n]*\n)/,
      `$1\nSafety filter disclosure: ${limitation}\n`,
    );
    return { changed: true, text: redactedText };
  } catch {
    return { changed: false, text };
  }
}

function validateProducedArtifactSafety(
  producedArtifact: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const lines = producedArtifact
    .split("\n")
    .flatMap((line) => line.split(/(?<=[.!?])\s+(?=[A-Z])/));

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || isExplicitlyQualifiedLine(line)) continue;
    for (const [pattern, label] of unsafeGeneratedLinePatterns) {
      if (pattern.test(line)) {
        const excerpt = line.replace(/\s+/g, " ").slice(0, 220);
        issues.push({
          kind: "safety",
          message: `Produced Artifact contains an unqualified ${label}. Rejected line: "${excerpt}"`,
        });
      }
    }
  }

  if (
    /publish approved context to workspace context/i.test(producedArtifact)
  ) {
    issues.push({
      kind: "safety",
      message:
        "A specialist must not expose the Company Context Builder publication phrase.",
    });
  }
  if (
    /\bworkspace[_ ]id\b|\bsession[_ ]id\b|\bconfigured integrations?\b|\bruntime account\b/i.test(
      producedArtifact,
    )
  ) {
    issues.push({
      kind: "safety",
      message:
        "Produced Artifact contains runtime metadata outside an explicit diagnostic.",
    });
  }

  return issues;
}

function validateHipaaConstraintLanguage(
  text: string,
  expectedHipaaConstraint?: string,
): ValidationIssue[] {
  const exactMatches = expectedHipaaConstraint
    ? text.split(expectedHipaaConstraint).length - 1
    : (
        text.match(
          new RegExp(approvedHipaaConstraintPattern.source, "gi"),
        ) ?? []
      ).length;
  const issues: ValidationIssue[] = [];
  if (expectedHipaaConstraint && exactMatches !== 1) {
    issues.push({
      kind: "safety",
      message:
        "The exact approved HIPAA constraint from Guild Workspace Context must appear verbatim exactly once.",
    });
  } else if (exactMatches > 1) {
    issues.push({
      kind: "safety",
      message:
        "The approved HIPAA constraint appears more than once. Preserve the exact source wording once and refer to it elsewhere only as the approved HIPAA constraint.",
    });
  }
  if (hasDisallowedHipaaLanguage(text, expectedHipaaConstraint)) {
    issues.push({
      kind: "safety",
      message:
        "The HIPAA constraint was paraphrased or expanded. Preserve the exact source wording and refer to it elsewhere only as the approved HIPAA constraint.",
    });
  }
  return issues;
}

function hasDisallowedHipaaLanguage(
  text: string,
  expectedHipaaConstraint?: string,
): boolean {
  const withoutExactConstraint = expectedHipaaConstraint
    ? text.split(expectedHipaaConstraint).join("")
    : text.replace(
        new RegExp(approvedHipaaConstraintPattern.source, "gi"),
        "",
      );
  const withoutApprovedReference = withoutExactConstraint.replace(
    /\b(?:the\s+)?approved HIPAA constraint\b/gi,
    "",
  );
  return /\bHIPAA\b|\bPHI\b|Protected Health Information/i.test(
    withoutApprovedReference,
  );
}

function extractExpectedHipaaConstraint(text: string): string | undefined {
  const match = text.match(
    /Exact approved HIPAA constraint for verbatim reuse:\s*"([^"\n]+)"/i,
  );
  return match?.[1]?.trim() || undefined;
}

function isExplicitlyQualifiedLine(line: string): boolean {
  return /\b(?:approved[-_ ]reusable|do not use|do not claim|must not claim|blocked|unsupported|needs evidence|requires? (?:separate )?(?:evidence|approval|review|validation)|tbd|source[-_ ]supplied(?:[-_ ]review[-_ ]required| only)?|review[-_ ]required|secondary[-_ ]estimate|claim status|evidence status|missing (?:proof|evidence)|proof needs?|limitation|unapproved|pending verification|subject to (?:verification|review|approval)|not company[- ]confirmed|confirm|verify|validate|review)\b/i.test(
    line,
  );
}

function buildFormatRepairPrompt(
  originalRequest: string,
  initialText: string,
  issues: ValidationIssue[],
): string {
  return `
Format repair only.

Preserve the substance, evidence limits, safety meaning, and user request. Do not add, strengthen, remove, or reinterpret claims. Return only a corrected Markdown artifact.

Original request:
${originalRequest}

Format errors:
${issues.map((issue) => `- ${issue.message}`).join("\n")}

Original artifact:
${initialText}
`.trim();
}

function renderBlockedArtifact(issues: ValidationIssue[]): string {
  const messages = issues.length
    ? issues.map((issue) => `- ${issue.message}`).join("\n")
    : "- The generated artifact did not pass deterministic validation.";
  return `## Consumed Context

The requested specialist workflow and available context were reviewed, but the generated artifact did not pass the shared Marketing OS contract.

## Produced Artifact

No specialist draft is returned because doing so would expose an artifact that failed deterministic evidence, format, or safety validation.

## Assumptions And Missing Evidence

Evidence mode: source_supplied

${messages}

## Approval Gate

No approval is available. Revise the source or request and run the specialist again through Marketing OS Launcher.

## AEO / AI-Readiness Contribution

No answer-ready claims were produced from the rejected attempt.

## Status Payload

\`\`\`json
{
  "evidence_mode": "source_supplied",
  "observed_at": null,
  "source_coverage": [],
  "coverage_limitations": ["The generated artifact failed deterministic validation."],
  "status": "blocked",
  "safety": {
    "action_mode": "draft_only",
    "external_mutation_requested": false,
    "blocked_actions": ["live publishing", "scheduling", "paid spend", "CRM mutation", "credential setup", "legal approval"],
    "unsupported_claims": [],
    "evidence_gaps": ["A contract-valid specialist artifact is required."]
  }
}
\`\`\`

## Downstream Handoff

Return to Marketing OS Launcher with the validation errors above. No external action occurred.`;
}

function allIndexes(text: string, value: string): number[] {
  const indexes: number[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    const index = text.indexOf(value, cursor);
    if (index === -1) break;
    indexes.push(index);
    cursor = index + value.length;
  }
  return indexes;
}

function extractSection(
  text: string,
  startHeading: string,
  endHeading: string,
): string {
  const start = text.indexOf(startHeading);
  if (start === -1) return "";
  const bodyStart = start + startHeading.length;
  const end = text.indexOf(endHeading, bodyStart);
  return text.slice(bodyStart, end === -1 ? undefined : end).trim();
}

function extractJsonFence(section: string): string | undefined {
  const matches = [...section.matchAll(/```json\s*([\s\S]*?)```/gi)];
  return matches.length === 1 ? matches[0][1].trim() : undefined;
}
