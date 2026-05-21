import path from "node:path";
import { caseStatus, generateCaseId, initCase, refreshCase, requireCaseId } from "../cases.js";
import { configureSaleorApiEnvVars } from "./start-command.js";

export async function startWorkflow(caseId?: string): Promise<void> {
  await configureSaleorApiEnvVars();
  await startCase(caseId);
}

export async function refreshWorkflow(caseId?: string): Promise<void> {
  const resolvedCaseId = await requireCaseId(caseId);
  const root = await refreshCase(resolvedCaseId);
  console.log(`Refreshed ${resolvedCaseId} at ${root}`);
  console.log("");
  console.log(workflowPrompt(root));
}

export async function statusWorkflow(caseId?: string): Promise<void> {
  const resolvedCaseId = await requireCaseId(caseId);
  console.log(JSON.stringify(await caseStatus(resolvedCaseId), null, 2));
}

export async function startCase(caseId = generateCaseId()): Promise<void> {
  const root = await initCase(caseId);
  console.log(`Started ${caseId}`);
  console.log(`Case directory: ${root}`);
  console.log("");
  console.log(workflowPrompt(root));
}

function workflowPrompt(root: string): string {
  return `Case is ready.

If using a coding agent manually, have it read \`skills/investigate/SKILL.md\` and \`${path.join(root, "SETUP.md")}\`. The normal path is to invoke \`$investigate\` with the customer report as input and let the skill start the case.

Keep context compact: cite artifact paths, do not paste full customer records, and put only confirmed conclusions in \`${path.join(root, "FINDINGS.md")}\`.`;
}
