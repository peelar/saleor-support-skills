export type EnvName = "prod" | "sandbox";

export type OperationKind = "query" | "mutation" | "subscription";

export type SchemaIndex = {
  generatedAt: string;
  source: {
    env: EnvName;
    apiUrl: string;
  };
  queryType?: string;
  mutationType?: string;
  subscriptionType?: string;
  types: Record<
    string,
    {
      kind: string;
      description?: string;
      fields?: Record<
        string,
        {
          type: string;
          description?: string;
          args?: Record<string, { type: string; description?: string }>;
        }
      >;
      inputFields?: Record<string, { type: string; description?: string }>;
      enumValues?: string[];
    }
  >;
};
