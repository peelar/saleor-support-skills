import path from "node:path";

export function cliInvocation(): string {
  const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
  if (entryPath.endsWith("saleor-investigate.cjs") || entryPath.endsWith(`${path.sep}dist${path.sep}cli.js`)) {
    return `${shellQuote(process.execPath)} ${shellQuote(entryPath)}`;
  }
  return "pnpm dev";
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}
