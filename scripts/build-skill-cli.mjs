#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { build } from "esbuild";

const root = process.cwd();
const outputPath = path.join(root, "skills", "investigate", "scripts", "saleor-investigate.cjs");
const checkOnly = process.argv.includes("--check");

const result = await build({
  entryPoints: [path.join(root, "src", "cli.ts")],
  bundle: true,
  legalComments: "eof",
  platform: "node",
  format: "cjs",
  target: "node20",
  write: false,
});

const output = result.outputFiles[0]?.contents;
if (!output) {
  throw new Error("esbuild did not produce the skill CLI bundle");
}

if (checkOnly) {
  const existing = await readOptional(outputPath);
  if (!existing || !Buffer.from(output).equals(existing)) {
    throw new Error("The bundled skill CLI is stale. Run `pnpm build:skill-cli`.");
  }
  console.log("Bundled skill CLI is current.");
} else {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, output, { mode: 0o755 });
  await fs.chmod(outputPath, 0o755);
  console.log(`Built ${path.relative(root, outputPath)}`);
}

async function readOptional(filePath) {
  try {
    return await fs.readFile(filePath);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}
