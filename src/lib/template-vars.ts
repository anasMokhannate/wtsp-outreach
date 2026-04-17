export interface VariableMapping {
  source: "static" | "prospect_name" | "prospect_email" | "prospect_phone";
  value?: string;
}

export interface ProspectData {
  name: string | null;
  email: string | null;
  phoneNumber: string;
}

const VAR_RE = /\{\{(\d+)\}\}/g;

// Returns sorted, unique variable numbers (e.g. [1, 2, 3]) found in the text
export function extractVariables(text: string | null | undefined): number[] {
  if (!text) return [];
  const nums = new Set<number>();
  for (const match of text.matchAll(VAR_RE)) {
    nums.add(parseInt(match[1], 10));
  }
  return Array.from(nums).sort((a, b) => a - b);
}

// Resolve a single variable mapping against a prospect
export function resolveMapping(
  mapping: VariableMapping,
  prospect: ProspectData
): string {
  switch (mapping.source) {
    case "prospect_name":
      return prospect.name || "";
    case "prospect_email":
      return prospect.email || "";
    case "prospect_phone":
      return prospect.phoneNumber;
    case "static":
    default:
      return mapping.value || "";
  }
}

// Replace {{n}} placeholders in text with the resolved values, in order.
// e.g. "Hi {{1}}, about {{2}}" with params ["Alice", "offer"] -> "Hi Alice, about offer"
export function resolveText(
  text: string,
  mappings: Record<number, VariableMapping>,
  prospect: ProspectData
): string {
  return text.replace(VAR_RE, (_match, numStr) => {
    const n = parseInt(numStr, 10);
    const mapping = mappings[n];
    if (!mapping) return `{{${n}}}`;
    return resolveMapping(mapping, prospect);
  });
}

// Build an ordered array of parameter values for Meta's components API.
// Numbers must be filled consecutively: [value for {{1}}, value for {{2}}, ...].
export function buildParamsArray(
  variableNumbers: number[],
  mappings: Record<number, VariableMapping>,
  prospect: ProspectData
): string[] {
  return variableNumbers.map((n) => {
    const mapping = mappings[n];
    if (!mapping) return "";
    return resolveMapping(mapping, prospect);
  });
}
