import path from "node:path";
import fs from "node:fs/promises";
import { appConfig } from "./config.js";
import { UserError } from "./errors.js";
import { caseDir, currentCasePath, ensureDir, pathExists, readJson, timestampSlug, writeJson, writeText, writeTextIfMissing } from "./fs.js";

export type CaseStatus = {
  caseId: string;
  root: string;
  manifestPath: string;
  createdAt?: string;
  updatedAt?: string;
  files: Record<string, number>;
  nextFiles: string[];
};

type CaseManifest = {
  caseId: string;
  createdAt: string;
  updatedAt: string;
  workflow: "investigate";
  safety: {
    prodWrites: "forbidden";
    sandboxWrites: "allowed";
  };
  paths: {
    setup: string;
    info: string;
    investigation: string;
    findings: string;
    report: string;
  };
};

export async function initCase(caseId: string): Promise<string> {
  const root = caseDir(caseId);
  const dirs = [
    root,
    path.join(root, "prod", "queries"),
    path.join(root, "prod", "responses"),
    path.join(root, "prod", "drafted-mutations"),
    path.join(root, "sandbox", "queries"),
    path.join(root, "sandbox", "mutations"),
    path.join(root, "sandbox", "responses"),
    path.join(root, "docs"),
    path.join(root, "artifacts"),
  ];

  for (const dir of dirs) {
    await ensureDir(dir);
  }

  await writeCaseManifest(caseId);
  await writeTextIfMissing(path.join(root, "SETUP.md"), setupTemplate(caseId));
  await writeTextIfMissing(path.join(root, "INFO.md"), infoTemplate(caseId));
  await writeTextIfMissing(path.join(root, "INVESTIGATION.md"), investigationTemplate(caseId));
  await writeTextIfMissing(path.join(root, "FINDINGS.md"), findingsTemplate(caseId));
  await writeTextIfMissing(
    path.join(root, "NOTES.md"),
    `# ${caseId}\n\n## Customer Report\n\n## Observations\n\n## Hypotheses\n\n## Evidence\n\n`,
  );
  await writeTextIfMissing(path.join(root, "REPORT.md"), reportTemplate(caseId));
  await setCurrentCase(caseId);

  return root;
}

export async function refreshCase(caseId: string): Promise<string> {
  const root = await initCase(caseId);
  await writeText(path.join(root, "SETUP.md"), setupTemplate(caseId));
  await writeCaseManifest(caseId);
  return root;
}

export async function caseStatus(caseId: string): Promise<CaseStatus> {
  const root = caseDir(caseId);
  const manifestPath = path.join(root, "manifest.json");
  let manifest: CaseManifest | undefined;
  if (await pathExists(manifestPath)) {
    manifest = await readJson<CaseManifest>(manifestPath);
  }

  return {
    caseId,
    root,
    manifestPath,
    createdAt: manifest?.createdAt,
    updatedAt: manifest?.updatedAt,
    files: {
      prodQueries: await countFiles(path.join(root, "prod", "queries")),
      prodResponses: await countFiles(path.join(root, "prod", "responses"), { excludeSuffix: "-summary.json" }),
      prodMutationDrafts: await countFiles(path.join(root, "prod", "drafted-mutations")),
      sandboxQueries: await countFiles(path.join(root, "sandbox", "queries")),
      sandboxMutations: await countFiles(path.join(root, "sandbox", "mutations")),
      sandboxResponses: await countFiles(path.join(root, "sandbox", "responses"), { excludeSuffix: "-summary.json" }),
      docsProposals: await countFiles(path.join(root, "docs")),
      artifacts: await countFiles(path.join(root, "artifacts")),
    },
    nextFiles: [
      path.join(root, "SETUP.md"),
      path.join(root, "INFO.md"),
      path.join(root, "INVESTIGATION.md"),
      path.join(root, "FINDINGS.md"),
      path.join(root, "REPORT.md"),
    ],
  };
}

export function generateCaseId(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hour = pad(date.getHours());
  const minute = pad(date.getMinutes());
  const second = pad(date.getSeconds());
  return `case-${year}${month}${day}-${hour}${minute}${second}`;
}

export async function currentCaseId(): Promise<string | undefined> {
  const filePath = currentCasePath();
  if (!(await pathExists(filePath))) {
    return undefined;
  }
  const state = await readJson<{ caseId?: string }>(filePath);
  return state.caseId;
}

export async function requireCaseId(explicitCaseId?: string): Promise<string> {
  const caseId = explicitCaseId ?? (await currentCaseId());
  if (!caseId) {
    throw new UserError("No current case. Run `pnpm dev` first, or pass --case <CASE-ID>.");
  }
  return caseId;
}

async function setCurrentCase(caseId: string): Promise<void> {
  await writeJson(currentCasePath(), {
    caseId,
    updatedAt: new Date().toISOString(),
  });
}

async function writeCaseManifest(caseId: string): Promise<void> {
  const root = caseDir(caseId);
  const manifestPath = path.join(root, "manifest.json");
  const now = new Date().toISOString();
  let createdAt = now;
  if (await pathExists(manifestPath)) {
    const existing = await readJson<CaseManifest>(manifestPath);
    createdAt = existing.createdAt;
  }

  await writeJson(manifestPath, {
    caseId,
    createdAt,
    updatedAt: now,
    workflow: "investigate",
    safety: {
      prodWrites: "forbidden",
      sandboxWrites: "allowed",
    },
    paths: {
      setup: "SETUP.md",
      info: "INFO.md",
      investigation: "INVESTIGATION.md",
      findings: "FINDINGS.md",
      report: "REPORT.md",
    },
  } satisfies CaseManifest);
}

async function countFiles(dir: string, options: { excludeSuffix?: string } = {}): Promise<number> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries.filter((entry) => entry.isFile() && !entry.name.endsWith(options.excludeSuffix ?? "\0")).length;
  } catch {
    return 0;
  }
}

function setupTemplate(caseId: string): string {
  const config = appConfig();
  return `# ${caseId} Setup

This file is the case runbook. The canonical agent workflow is \`skills/investigate/SKILL.md\`. Use this case directory as durable state.

## Scope

- Investigate Saleor API behavior only.
- Use customer/prod only for read-only GraphQL queries.
- Never execute a mutation or subscription against prod.
- For write reproduction, draft the prod mutation as an example and perform the write only in sandbox.
- Keep customer data minimal in files. Prefer IDs and redacted snippets over full records.

## Configured Inputs

- Prod endpoint: ${process.env.SALEOR_PROD_API_URL || "not configured"}
- Sandbox endpoint: ${process.env.SALEOR_SANDBOX_API_URL || "not configured"}
- Saleor source path: ${config.sourceDir || "not configured"}
- Saleor docs path: ${config.docsDir || "not configured"}

## Required First Pass

1. Fill \`INFO.md\` with a short case-specific brief.
2. Run \`pnpm dev help\` and topic help before using CLI tools. CLI help is the command syntax source of truth.
3. Pull schemas if missing or stale.
4. Search docs and source before writing GraphQL.
5. Create focused prod query files under \`prod/queries/\`.
6. Execute only query operations against prod.
7. If a write is needed, create sandbox mutation files under \`sandbox/mutations/\` and run them with \`pnpm sandbox mutation run <file>\`.
8. Put evidence and hypotheses in \`INVESTIGATION.md\`.
9. Put confirmed findings in \`FINDINGS.md\`.
10. Finish with \`REPORT.md\`.

## Useful Commands

\`\`\`bash
pnpm dev help
pnpm dev help schema
pnpm dev help graphql
pnpm dev help query
pnpm dev help mutation
pnpm dev help research
\`\`\`
`;
}

function infoTemplate(caseId: string): string {
  return `# ${caseId} Info

Keep this short. Target 50-100 lines total. This file is injected into the agent's working context by convention, so verbose notes dilute signal.

## Customer Report

## Affected API Surface

## Known IDs and Redactions

## Expected Behavior

## Actual Behavior

## Environment Notes

## Saleor-Specific Context

`;
}

function investigationTemplate(caseId: string): string {
  return `# ${caseId} Investigation

## Timeline

- ${timestampSlug()}: Case initialized.

## Questions

## Schema Notes

## Docs Notes

## Source Notes

## Prod Query Evidence

## Sandbox Reproduction

## Hypotheses

`;
}

function findingsTemplate(caseId: string): string {
  return `# ${caseId} Findings

Only promote a finding here after it has evidence.

## Finding 1

- Status:
- Confidence:
- Evidence:
- Root cause:
- Customer-safe next step:
- Saleor follow-up:

`;
}

function reportTemplate(caseId: string): string {
  return `# ${caseId} Report

## Summary

## Reproduction

## Evidence

## Root Cause

## Customer-Safe Next Steps

## Suggested Saleor Follow-Up

## Docs Gap

`;
}
