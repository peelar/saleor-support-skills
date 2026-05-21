import { UserError } from "../errors.js";

export type CaseOptionInput = {
  case?: unknown;
  caseId?: unknown;
};

export type GraphqlOptionInput = CaseOptionInput & {
  execute?: unknown;
  variables?: unknown;
  vars?: unknown;
};

export function required(value: string | undefined, label: string): string {
  if (!value) {
    throw new UserError(`Missing ${label}`);
  }
  return value;
}

export function caseOption(options: CaseOptionInput): string | undefined {
  return stringOption(options.case ?? options.caseId, "--case value");
}

export function graphqlOptions(options: GraphqlOptionInput): {
  caseId?: string;
  variables?: string;
  execute: boolean;
} {
  const variables = stringOption(options.variables, "--variables value");
  const vars = stringOption(options.vars, "--vars value");
  if (variables && vars && variables !== vars) {
    throw new UserError("Use only one of --variables or --vars");
  }
  return {
    caseId: caseOption(options),
    variables: variables ?? vars,
    execute: options.execute === true,
  };
}

function stringOption(value: unknown, label: string): string | undefined {
  if (value === undefined || value === false) {
    return undefined;
  }
  if (typeof value === "string") {
    return required(value, label);
  }
  if (Array.isArray(value) && value.length === 1 && typeof value[0] === "string") {
    return required(value[0], label);
  }
  throw new UserError(`Invalid ${label}`);
}
