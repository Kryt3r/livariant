export function driftInputPath(args: string[]): string {
  const indexes = args.map((value, index) => value === "--input" ? index : -1).filter((index) => index >= 0);
  if (indexes.length !== 1) throw new Error("Drift requires exactly one --input <observation.json> argument.");
  const index = indexes[0];
  const path = args[index + 1];
  if (!path || path.startsWith("--")) throw new Error("--input requires an observation JSON path.");
  const allowed = new Set([index, index + 1]);
  args.forEach((value, itemIndex) => { if (value === "--json") allowed.add(itemIndex); });
  if (allowed.size !== args.length || args.filter((value) => value === "--json").length > 1) throw new Error("Drift supports only --input <observation.json> and optional --json.");
  return path;
}
