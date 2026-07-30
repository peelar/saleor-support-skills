import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, test } from "vitest";
import { initCase } from "../src/cases.js";

const originalCwd = process.cwd();
let temporaryRoot: string | undefined;

afterEach(async () => {
  process.chdir(originalCwd);
  if (temporaryRoot) {
    await fs.rm(temporaryRoot, { recursive: true, force: true });
    temporaryRoot = undefined;
  }
});

test("case creation writes the public investigation templates", async () => {
  temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "saleor-investigator-"));
  process.chdir(temporaryRoot);

  const caseRoot = await initCase("case-public-smoke");

  expect(caseRoot).toBe(path.join(await fs.realpath(temporaryRoot), ".saleor-investigate", "cases", "case-public-smoke"));
  await expect(fs.readFile(path.join(caseRoot, "INFO.md"), "utf8")).resolves.toContain("## Issue Report");
  await expect(fs.readFile(path.join(caseRoot, "REPORT.md"), "utf8")).resolves.toContain("## Upstream Follow-Up");
  await expect(fs.readFile(path.join(caseRoot, "SETUP.md"), "utf8")).resolves.toContain(
    "Use prod/live only for read-only GraphQL queries.",
  );
  await expect(fs.readFile(path.join(caseRoot, "SETUP.md"), "utf8")).resolves.toContain(
    "Saleor apps path: not configured",
  );
  await expect(fs.readFile(path.join(caseRoot, "SETUP.md"), "utf8")).resolves.toContain("pnpm dev help");
});
