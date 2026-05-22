import { afterEach, expect, test, vi } from "vitest";
import { requestGraphql } from "../src/client.js";

const originalFetch = globalThis.fetch;
const originalProdUrl = process.env.SALEOR_PROD_API_URL;
const originalSandboxUrl = process.env.SALEOR_SANDBOX_API_URL;

afterEach(() => {
  globalThis.fetch = originalFetch;
  restoreEnv("SALEOR_PROD_API_URL", originalProdUrl);
  restoreEnv("SALEOR_SANDBOX_API_URL", originalSandboxUrl);
  vi.restoreAllMocks();
});

test("prod mutations are rejected before fetch", async () => {
  process.env.SALEOR_PROD_API_URL = "https://prod.example.com/graphql/";
  const fetchMock = vi.fn(async () => {
    throw new Error("fetch should not be called");
  });
  globalThis.fetch = fetchMock;

  await expect(
    requestGraphql(
      "prod",
      `mutation UpdateOrder {
        orderUpdate(id: "T3JkZXI6MQ==", input: {}) {
          order {
            id
          }
        }
      }`,
    ),
  ).rejects.toThrow(/Prod execution is query-only\. Refused operation type\(s\): mutation/);
  expect(fetchMock).not.toHaveBeenCalled();
});

test("prod subscriptions are rejected before fetch", async () => {
  process.env.SALEOR_PROD_API_URL = "https://prod.example.com/graphql/";
  const fetchMock = vi.fn(async () => {
    throw new Error("fetch should not be called");
  });
  globalThis.fetch = fetchMock;

  await expect(
    requestGraphql(
      "prod",
      `subscription OrderEvents {
        event {
          ... on OrderCreated {
            order {
              id
            }
          }
        }
      }`,
    ),
  ).rejects.toThrow(/Prod execution is query-only\. Refused operation type\(s\): subscription/);
  expect(fetchMock).not.toHaveBeenCalled();
});

test("prod queries still execute through fetch", async () => {
  process.env.SALEOR_PROD_API_URL = "https://prod.example.com/graphql/";
  const fetchMock = vi.fn(async (input, init) => {
    expect(input).toBe("https://prod.example.com/graphql/");
    expect(init?.method).toBe("POST");
    return jsonResponse({ data: { shop: { name: "Demo" } } });
  });
  globalThis.fetch = fetchMock;

  const response = await requestGraphql(
    "prod",
    `query ShopName {
      shop {
        name
      }
    }`,
  );

  expect(response).toEqual({ data: { shop: { name: "Demo" } } });
  expect(fetchMock).toHaveBeenCalledOnce();
});

test("sandbox mutations execute through fetch", async () => {
  process.env.SALEOR_SANDBOX_API_URL = "https://sandbox.example.com/graphql/";
  const fetchMock = vi.fn(async (input, init) => {
    expect(input).toBe("https://sandbox.example.com/graphql/");
    expect(init?.method).toBe("POST");
    return jsonResponse({ data: { orderUpdate: { order: { id: "T3JkZXI6MQ==" } } } });
  });
  globalThis.fetch = fetchMock;

  const response = await requestGraphql(
    "sandbox",
    `mutation UpdateOrder {
      orderUpdate(id: "T3JkZXI6MQ==", input: {}) {
        order {
          id
        }
      }
    }`,
  );

  expect(response).toEqual({ data: { orderUpdate: { order: { id: "T3JkZXI6MQ==" } } } });
  expect(fetchMock).toHaveBeenCalledOnce();
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function restoreEnv(name: "SALEOR_PROD_API_URL" | "SALEOR_SANDBOX_API_URL", value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}
