import { caseStatus, initCase, refreshCase, requireCaseId } from "../cases.js";
import { appendText, caseDir } from "../fs.js";
import path from "node:path";
import { required } from "./cli-options.js";

export async function initCaseCommand(caseId: string): Promise<void> {
  const root = await initCase(caseId);
  console.log(`Initialized case at ${root}`);
  console.log(`Next: read ${path.join(root, "SETUP.md")} and fill ${path.join(root, "INFO.md")}`);
}

export async function refreshCaseCommand(caseId?: string): Promise<void> {
  const resolvedCaseId = await requireCaseId(caseId);
  const root = await refreshCase(resolvedCaseId);
  console.log(`Refreshed generated setup files at ${root}`);
}

export async function statusCaseCommand(caseId?: string): Promise<void> {
  const resolvedCaseId = await requireCaseId(caseId);
  console.log(JSON.stringify(await caseStatus(resolvedCaseId), null, 2));
}

export async function noteCaseCommand(caseId: string | undefined, noteParts: string[]): Promise<void> {
  const resolvedCaseId = await requireCaseId(caseId);
  const note = noteParts.join(" ").trim();
  required(note, "note text");
  await appendText(path.join(caseDir(resolvedCaseId), "NOTES.md"), `\n- ${new Date().toISOString()}: ${note}\n`);
  console.log(`Appended note to ${path.join(caseDir(resolvedCaseId), "NOTES.md")}`);
}
