// Pure scoring helper - no server-only imports so it's unit-testable.
export function calcScore(
  row: Record<string, string>,
  identifierField: string,
): { score: number; max: number } | null {
  const skip = new Set([identifierField, "Timestamp", "Email Address"]);
  const ans = Object.entries(row).filter(([k]) => !skip.has(k));
  if (!ans.length) return null;
  const score = ans.filter(([, v]) => v && v.trim() !== "").length;
  return { score, max: ans.length };
}
