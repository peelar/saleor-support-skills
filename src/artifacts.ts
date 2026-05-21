import path from "node:path";
import { caseDir, ensureDir, readJson, writeJson } from "./fs.js";
import type { EnvName, OperationKind } from "./types.js";
import type { GraphqlResponseSummary } from "./response-summary.js";

export type ArtifactIndexEntry = {
  generatedAt: string;
  env: EnvName;
  command: "query" | "mutation" | "prod-mutation-inspection";
  operationKinds: OperationKind[];
  documentPath?: string;
  variablesPath?: string;
  responsePath: string;
  summaryPath?: string;
  outcome: GraphqlResponseSummary["outcome"];
  permissionBlockers: GraphqlResponseSummary["permissionBlockers"];
  topLevelDataKeys: string[];
};

type ArtifactIndex = {
  version: 1;
  updatedAt: string;
  entries: ArtifactIndexEntry[];
};

export async function appendArtifactIndex(caseId: string | undefined, entry: ArtifactIndexEntry): Promise<void> {
  if (!caseId) {
    return;
  }

  const indexPath = path.join(caseDir(caseId), "artifact-index.json");
  await ensureDir(path.dirname(indexPath));
  const existing = await readIndex(indexPath);
  const entries = existing.entries.filter((candidate) => candidate.responsePath !== entry.responsePath);
  entries.push(entry);
  await writeJson(indexPath, {
    version: 1,
    updatedAt: new Date().toISOString(),
    entries,
  } satisfies ArtifactIndex);
}

async function readIndex(indexPath: string): Promise<ArtifactIndex> {
  try {
    return await readJson<ArtifactIndex>(indexPath);
  } catch {
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      entries: [],
    };
  }
}
