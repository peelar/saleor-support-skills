import {
  buildClientSchema,
  buildSchema,
  getIntrospectionQuery,
  getNamedType,
  getNullableType,
  GraphQLArgument,
  GraphQLField,
  GraphQLInputObjectType,
  GraphQLInputType,
  GraphQLInterfaceType,
  GraphQLObjectType,
  GraphQLOutputType,
  GraphQLSchema,
  GraphQLType,
  IntrospectionQuery,
  isEnumType,
  isInputObjectType,
  isInterfaceType,
  isObjectType,
  isSpecifiedScalarType,
  isUnionType,
  parse,
  printSchema,
  validate,
} from "graphql";
import { UserError } from "./errors.js";
import { readJson, readText, schemaPath, writeJson, writeText } from "./fs.js";
import type { EnvName, OperationKind, SchemaIndex } from "./types.js";

export function operationKinds(documentText: string): OperationKind[] {
  const document = parse(documentText);
  const kinds = new Set<OperationKind>();

  for (const definition of document.definitions) {
    if (definition.kind === "OperationDefinition") {
      kinds.add(definition.operation);
    }
  }

  return [...kinds];
}

export function assertOnlyQueries(documentText: string): void {
  const kinds = operationKinds(documentText);
  const forbidden = kinds.filter((kind) => kind !== "query");
  if (forbidden.length > 0) {
    throw new UserError(`Prod execution is query-only. Refused operation type(s): ${forbidden.join(", ")}`);
  }
}

export function assertContainsMutation(documentText: string): void {
  const kinds = operationKinds(documentText);
  if (!kinds.includes("mutation")) {
    throw new UserError("Expected a GraphQL mutation document");
  }
}

export async function loadCachedSchema(env: EnvName): Promise<GraphQLSchema> {
  const sdl = await readText(schemaPath(env, "schema.graphql"));
  return buildSchema(sdl);
}

export async function validateDocument(env: EnvName, documentText: string): Promise<string[]> {
  const schema = await loadCachedSchema(env);
  const document = parse(documentText);
  return validate(schema, document).map((error) => error.message);
}

export async function saveIntrospectionSchema(
  env: EnvName,
  apiUrl: string,
  introspection: IntrospectionQuery,
): Promise<void> {
  const schema = buildClientSchema(introspection);
  await writeJson(schemaPath(env, "introspection.json"), introspection);
  await writeText(schemaPath(env, "schema.graphql"), `${printSchema(schema)}\n`);
  await writeJson(schemaPath(env, "index.json"), buildSchemaIndex(env, apiUrl, schema));
}

export async function loadSchemaIndex(env: EnvName): Promise<SchemaIndex> {
  return readJson<SchemaIndex>(schemaPath(env, "index.json"));
}

export function introspectionQuery(): string {
  return getIntrospectionQuery({
    descriptions: true,
    specifiedByUrl: true,
    directiveIsRepeatable: true,
    schemaDescription: true,
    inputValueDeprecation: true,
  });
}

export function compatibilityIntrospectionQuery(): string {
  return getIntrospectionQuery({
    descriptions: true,
    specifiedByUrl: false,
    directiveIsRepeatable: false,
    schemaDescription: false,
    inputValueDeprecation: false,
  });
}

function buildSchemaIndex(env: EnvName, apiUrl: string, schema: GraphQLSchema): SchemaIndex {
  const typeMap = schema.getTypeMap();
  const types: SchemaIndex["types"] = {};

  for (const [name, type] of Object.entries(typeMap)) {
    if (name.startsWith("__") || isSpecifiedScalarType(type)) {
      continue;
    }

    if (isObjectType(type) || isInterfaceType(type)) {
      types[name] = {
        kind: isObjectType(type) ? "OBJECT" : "INTERFACE",
        description: optionalString(type.description),
        fields: fieldIndex(type),
      };
      continue;
    }

    if (isInputObjectType(type)) {
      types[name] = {
        kind: "INPUT_OBJECT",
        description: optionalString(type.description),
        inputFields: inputFieldIndex(type),
      };
      continue;
    }

    if (isEnumType(type)) {
      types[name] = {
        kind: "ENUM",
        description: optionalString(type.description),
        enumValues: type.getValues().map((value) => value.name),
      };
      continue;
    }

    if (isUnionType(type)) {
      types[name] = {
        kind: "UNION",
        description: optionalString(type.description),
      };
      continue;
    }

    types[name] = {
      kind: String(type.astNode?.kind ?? "UNKNOWN"),
      description: "description" in type ? optionalString(type.description) : undefined,
    };
  }

  return {
    generatedAt: new Date().toISOString(),
    source: { env, apiUrl },
    queryType: schema.getQueryType()?.name,
    mutationType: schema.getMutationType()?.name,
    subscriptionType: schema.getSubscriptionType()?.name,
    types,
  };
}

function fieldIndex(type: GraphQLObjectType | GraphQLInterfaceType): NonNullable<SchemaIndex["types"][string]["fields"]> {
  const fields: NonNullable<SchemaIndex["types"][string]["fields"]> = {};
  for (const [fieldName, field] of Object.entries(type.getFields())) {
    fields[fieldName] = {
      type: typeName(field.type),
      description: optionalString(field.description),
      args: argumentIndex(field),
    };
  }
  return fields;
}

function argumentIndex(field: GraphQLField<unknown, unknown>): Record<string, { type: string; description?: string }> {
  const args: Record<string, { type: string; description?: string }> = {};
  for (const arg of field.args) {
    args[arg.name] = {
      type: typeName(arg.type),
      description: optionalString(arg.description),
    };
  }
  return args;
}

function inputFieldIndex(type: GraphQLInputObjectType): NonNullable<SchemaIndex["types"][string]["inputFields"]> {
  const fields: NonNullable<SchemaIndex["types"][string]["inputFields"]> = {};
  for (const [fieldName, field] of Object.entries(type.getFields())) {
    fields[fieldName] = {
      type: typeName(field.type),
      description: optionalString(field.description),
    };
  }
  return fields;
}

function typeName(type: GraphQLType | GraphQLInputType | GraphQLOutputType | GraphQLArgument["type"]): string {
  const nullable = getNullableType(type);
  const named = getNamedType(type);
  const prefix = nullable === type ? "" : "NonNull ";
  return `${prefix}${String(type)} (${named.name})`;
}

function optionalString(value: string | null | undefined): string | undefined {
  return value ?? undefined;
}
