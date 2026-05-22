import assert from "node:assert/strict";
import test from "node:test";
import { requestGraphql } from "../src/client.js";

const originalFetch = globalThis.fetch;
const originalProdUrl = process.env.SALEOR_PROD_API_URL;
const originalSandboxUrl = process.env.SALEOR_SANDBOX_API_URL;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  restoreEnv("SALEOR_PROD_API_URL", originalProdUrl);
  restoreEnv("SALEOR_SANDBOX_API_URL", originalSandboxUrl);
});

test("prod mutations are rejected before fetch", async () => {
  let fetchCalled = false;
  process.env.SALEOR_PROD_API_URL = "https://prod.example.com/graphql/";
  globalThis.fetch = async () => {
    fetchCalled = true;
    throw new Error("fetch should not be called");
  };

  await assert.rejects(
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
    /Prod execution is query-only\. Refused operation type\(s\): mutation/,
  );
  assert.equal(fetchCalled, false);
});

test("prod subscriptions are rejected before fetch", async () => {
  let fetchCalled = false;
  process.env.SALEOR_PROD_API_URL = "https://prod.example.com/graphql/";
  globalThis.fetch = async () => {
    fetchCalled = true;
    throw new Error("fetch should not be called");
  };

  await assert.rejects(
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
    /Prod execution is query-only\. Refused operation type\(s\): subscription/,
  );
  assert.equal(fetchCalled, false);
});

test("prod queries still execute through fetch", async () => {
  let fetchCalled = false;
  process.env.SALEOR_PROD_API_URL = "https://prod.example.com/graphql/";
  globalThis.fetch = async (input, init) => {
    fetchCalled = true;
    assert.equal(input, "https://prod.example.com/graphql/");
    assert.equal(init?.method, "POST");
    return jsonResponse({ data: { shop: { name: "Demo" } } });
  };

  const response = await requestGraphql(
    "prod",
    `query ShopName {
      shop {
        name
      }
    }`,
  );

  assert.deepEqual(response, { data: { shop: { name: "Demo" } } });
  assert.equal(fetchCalled, true);
});

test("sandbox mutations execute through fetch", async () => {
  let fetchCalled = false;
  process.env.SALEOR_SANDBOX_API_URL = "https://sandbox.example.com/graphql/";
  globalThis.fetch = async (input, init) => {
    fetchCalled = true;
    assert.equal(input, "https://sandbox.example.com/graphql/");
    assert.equal(init?.method, "POST");
    return jsonResponse({ data: { orderUpdate: { order: { id: "T3JkZXI6MQ==" } } } });
  };

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

  assert.deepEqual(response, { data: { orderUpdate: { order: { id: "T3JkZXI6MQ==" } } } });
  assert.equal(fetchCalled, true);
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
