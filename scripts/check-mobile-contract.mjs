import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const specPath = path.join(rootDir, "docs", "openapi-mobile-v1.json");
const readmePath = path.join(rootDir, "README.md");

const requiredOperations = [
  { method: "post", path: "/auth/login" },
  { method: "post", path: "/auth/refresh" },
  { method: "post", path: "/auth/logout" },
  { method: "get", path: "/auth/me", protected: true },
  { method: "get", path: "/auth/sessions", protected: true },
  { method: "get", path: "/auth/activity", protected: true },
  { method: "post", path: "/auth/logout-current", protected: true },
  { method: "post", path: "/auth/logout-other-sessions", protected: true },
  { method: "post", path: "/auth/sessions/{sessionId}/revoke", protected: true },
  { method: "post", path: "/auth/password-reset/request" },
  { method: "post", path: "/auth/password-reset/confirm" },
  { method: "get", path: "/shops" },
  { method: "get", path: "/shops/{slug}" },
  { method: "get", path: "/preferences/favorites" },
  { method: "put", path: "/preferences/favorites/{shopSlug}" },
  { method: "delete", path: "/preferences/favorites/{shopSlug}" },
  { method: "post", path: "/queue/join/start" },
  { method: "post", path: "/queue/join/verify" },
  { method: "get", path: "/queue/status/{trackingToken}" },
  { method: "post", path: "/queue/status/{trackingToken}/respond-arrival" },
  { method: "post", path: "/queue/status/{trackingToken}/leave" },
  { method: "post", path: "/queue/status/{trackingToken}/feedback" },
  { method: "get", path: "/ops/shops/{slug}/dashboard", protected: true },
  { method: "get", path: "/ops/shops/{slug}/profile", protected: true },
  { method: "put", path: "/ops/shops/{slug}/profile", protected: true },
  { method: "post", path: "/ops/shops/{slug}/walk-ins", protected: true },
  { method: "post", path: "/ops/shops/{slug}/pause-queue", protected: true },
  { method: "post", path: "/ops/shops/{slug}/resume-queue", protected: true },
  { method: "post", path: "/ops/shops/{slug}/queue/{trackingToken}/call", protected: true },
  { method: "post", path: "/ops/shops/{slug}/queue/{trackingToken}/start-service", protected: true },
  { method: "post", path: "/ops/shops/{slug}/queue/{trackingToken}/release-no-show", protected: true },
  { method: "post", path: "/ops/shops/{slug}/queue/{trackingToken}/reinstate", protected: true },
  { method: "post", path: "/ops/shops/{slug}/visits/{visitId}/extend-service", protected: true },
  { method: "post", path: "/ops/shops/{slug}/visits/{visitId}/complete-service", protected: true },
  { method: "get", path: "/auth/invitations/{token}" },
  { method: "post", path: "/auth/invitations/{token}/accept" },
  { method: "get", path: "/ops/shops/{slug}/invitations", protected: true },
  { method: "post", path: "/ops/shops/{slug}/invitations", protected: true },
  { method: "post", path: "/business-signups" }
];

const publicPathsThatMustNotDisappear = [
  "/auth/login",
  "/shops",
  "/shops/{slug}",
  "/queue/join/start",
  "/queue/join/verify",
  "/queue/status/{trackingToken}",
  "/queue/status/{trackingToken}/feedback"
];

const specRaw = fs.readFileSync(specPath, "utf8");
const spec = JSON.parse(specRaw);
const readme = fs.readFileSync(readmePath, "utf8");

const routerFiles = [
  "apps/api/src/routers/auth-router.ts",
  "apps/api/src/routers/shops-router.ts",
  "apps/api/src/routers/queue-router.ts",
  "apps/api/src/routers/operations-router.ts",
  "apps/api/src/routers/invitations-router.ts",
  "apps/api/src/routers/preferences-router.ts",
  "apps/api/src/routers/business-signups-router.ts"
];

const publicInternalPrefixes = ["/admin/", "/business-signups/{id}/approve", "/business-signups/{id}/reject"];

assert.equal(spec.openapi, "3.1.0", "OpenAPI version must be 3.1.0");
assert.equal(spec.info?.version, "v1", "Spec info.version must be v1");
assert.ok(spec.paths && typeof spec.paths === "object", "Spec must define paths");
assert.equal((specRaw.match(/"components"\s*:/g) ?? []).length, 1, "Spec must contain exactly one components block.");
assert.ok(
  readme.includes("./docs/openapi-mobile-v1.json"),
  "README must link to the machine-readable mobile OpenAPI spec."
);
assert.ok(readme.includes("contract:test:mobile"), "README should mention the mobile contract test command.");

for (const requiredOperation of requiredOperations) {
  const pathItem = spec.paths[requiredOperation.path];
  assert.ok(pathItem, `Missing required path in mobile spec: ${requiredOperation.path}`);
  assert.ok(
    pathItem[requiredOperation.method],
    `Missing ${requiredOperation.method.toUpperCase()} ${requiredOperation.path} in mobile spec.`
  );

  if (requiredOperation.protected) {
    assert.ok(
      Array.isArray(pathItem[requiredOperation.method].security) && pathItem[requiredOperation.method].security.length > 0,
      `Protected operation must declare security: ${requiredOperation.method.toUpperCase()} ${requiredOperation.path}`
    );
  }
}

for (const [pathKey, pathItem] of Object.entries(spec.paths)) {
  assert.ok(!pathKey.includes(":"), `OpenAPI path must use {param} syntax, found: ${pathKey}`);
  assert.ok(
    !publicInternalPrefixes.some((prefix) => pathKey.startsWith(prefix) || pathKey === prefix),
    `Mobile spec must not include internal-only route: ${pathKey}`
  );

  for (const [method, operation] of Object.entries(pathItem ?? {})) {
    if (!["get", "post", "put", "patch", "delete"].includes(method)) {
      continue;
    }

    assert.ok(operation.summary, `Missing summary for ${method.toUpperCase()} ${pathKey}`);
    assert.ok(operation.operationId, `Missing operationId for ${method.toUpperCase()} ${pathKey}`);
    assert.ok(operation.responses, `Missing responses for ${method.toUpperCase()} ${pathKey}`);

    const statusCodes = Object.keys(operation.responses);
    assert.ok(statusCodes.length > 0, `No responses defined for ${method.toUpperCase()} ${pathKey}`);

    const successStatus = statusCodes.find((statusCode) => /^2\d\d$/.test(statusCode));
    assert.ok(successStatus, `No success response defined for ${method.toUpperCase()} ${pathKey}`);

    const successResponse = operation.responses[successStatus];
    const jsonContent = successResponse?.content?.["application/json"];
    assert.ok(jsonContent, `Missing application/json response for ${method.toUpperCase()} ${pathKey}`);
    assert.ok(jsonContent.example || jsonContent.examples, `Missing JSON example for ${method.toUpperCase()} ${pathKey}`);

    if (operation.requestBody) {
      const requestJson = operation.requestBody.content?.["application/json"];
      assert.ok(requestJson, `Missing JSON requestBody content for ${method.toUpperCase()} ${pathKey}`);
      assert.ok(requestJson.example || requestJson.examples, `Missing JSON request example for ${method.toUpperCase()} ${pathKey}`);
    }
  }
}

const operationIds = new Set();
for (const [pathKey, pathItem] of Object.entries(spec.paths)) {
  for (const [method, operation] of Object.entries(pathItem ?? {})) {
    if (!["get", "post", "put", "patch", "delete"].includes(method)) {
      continue;
    }

    assert.ok(!operationIds.has(operation.operationId), `Duplicate operationId found: ${operation.operationId}`);
    operationIds.add(operation.operationId);
  }
}

function resolvePointer(document, pointer) {
  if (!pointer.startsWith("#/")) {
    throw new Error(`Only local refs are supported in contract test: ${pointer}`);
  }

  const segments = pointer
    .slice(2)
    .split("/")
    .map((segment) => segment.replace(/~1/g, "/").replace(/~0/g, "~"));

  let current = document;
  for (const segment of segments) {
    if (current == null || !(segment in current)) {
      throw new Error(`Unresolved $ref: ${pointer}`);
    }
    current = current[segment];
  }

  return current;
}

function walk(node) {
  if (Array.isArray(node)) {
    for (const item of node) {
      walk(item);
    }
    return;
  }

  if (!node || typeof node !== "object") {
    return;
  }

  if (typeof node.$ref === "string") {
    resolvePointer(spec, node.$ref);
  }

  for (const value of Object.values(node)) {
    walk(value);
  }
}

walk(spec);

for (const mustExist of publicPathsThatMustNotDisappear) {
  assert.ok(spec.paths[mustExist], `Public mobile path must remain documented: ${mustExist}`);
}

function extractRouterOperations(relativeFilePath) {
  const routerSource = fs.readFileSync(path.join(rootDir, relativeFilePath), "utf8");
  const operations = [];
  const routePattern = /router\.(get|post|put|patch|delete)\(\s*"([^"]+)"/g;
  let match = routePattern.exec(routerSource);

  while (match) {
    operations.push({
      method: match[1],
      path: match[2].replace(/:([A-Za-z0-9_]+)/g, "{$1}")
    });
    match = routePattern.exec(routerSource);
  }

  return operations;
}

const routerOperations = routerFiles.flatMap(extractRouterOperations);

for (const requiredOperation of requiredOperations) {
  const found = routerOperations.some(
    (operation) => operation.method === requiredOperation.method && operation.path === requiredOperation.path
  );
  assert.ok(
    found,
    `Router implementation is missing ${requiredOperation.method.toUpperCase()} ${requiredOperation.path}.`
  );
}

console.log(
  `Q-App mobile contract spec checks passed for ${requiredOperations.length} operations across ${routerFiles.length} router files.`
);
