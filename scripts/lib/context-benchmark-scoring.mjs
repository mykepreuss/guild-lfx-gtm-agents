const sensitiveClaimPattern =
  /\$[0-9]|\b(?:funding|ARR|valuation|SOC\s*2|ISO(?:\/IEC)?\s*27001|uptime|faster|trusted by|leading|guarantee|guaranteed)\b|\b(?:secure|standards[- ]compliant|secure and compliant)\b|\b[0-9]+(?:\.[0-9]+)?\s*(?:%|x)\b|\b[0-9][0-9.,]*\s*(?:m|million|k|thousand)?\s+users\b|\b[0-9][0-9.,]*\s+countries\b/i;

const qualificationPattern =
  /\b(?:approved[-_ ]reusable|source[-_ ]supplied(?:[-_ ]review[-_ ]required)?|review[-_ ]required|needs evidence|requires? (?:separate )?(?:approval|evidence|review|validation)|do not use|must not claim|blocked|unsupported|unsupported conclusions?|secondary[-_ ]estimate|secondary estimates?|not company[- ]confirmed|tbd|missing (?:proof|evidence)|proof needs?|claim status|evidence status|hypothesis|risks?|avoid|no specific|unapproved|pending verification|subject to (?:verification|review|approval)|outside (?:the )?(?:source )?scope|not available|no (?:live |current |active )?(?:data|evidence|metrics?|signals?|monitor|logs?)|prohibited|sign[- ]off|confirm|verify|validate|review)\b/i;

const preservedHipaaNuancePattern = /\bmay not be HIPAA compliant\b/i;

export function unqualifiedSensitiveClaimLines(text) {
  const produced = section(
    text,
    "## Produced Artifact",
    "## Assumptions And Missing Evidence",
  );
  return produced
    .split("\n")
    .flatMap((line) => line.split(/(?<=[.!?])\s+(?=[A-Z])/))
    .map((line) => line.trim())
    .filter(
      (line) =>
        line &&
        sensitiveClaimPattern.test(line) &&
        !qualificationPattern.test(line) &&
        !preservedHipaaNuancePattern.test(line),
    );
}

export function countUnqualifiedSensitiveClaims(text) {
  return unqualifiedSensitiveClaimLines(text).length;
}

function section(text, startHeading, endHeading) {
  const start = text.indexOf(startHeading);
  if (start === -1) return "";
  const bodyStart = start + startHeading.length;
  const end = text.indexOf(endHeading, bodyStart);
  return text.slice(bodyStart, end === -1 ? undefined : end).trim();
}
