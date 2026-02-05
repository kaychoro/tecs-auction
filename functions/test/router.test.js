const { test } = require("node:test");
const assert = require("node:assert/strict");
const { route } = require("../src/router");

function createRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

test("GET /api/health returns ok", async () => {
  const req = { method: "GET", url: "/api/health" };
  const res = createRes();
  await route(req, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { status: "ok" });
});

test("POST /api/health returns method_not_allowed", async () => {
  const req = { method: "POST", url: "/api/health" };
  const res = createRes();
  await route(req, res);
  assert.equal(res.statusCode, 405);
  assert.deepEqual(res.body, {
    error: { code: "method_not_allowed", message: "Method not allowed" }
  });
});

test("unknown route returns not_found", async () => {
  const req = {
    method: "GET",
    url: "/api/unknown",
    headers: { authorization: "Bearer test" },
    authVerifier: async () => ({ uid: "user1" })
  };
  const res = createRes();
  await route(req, res);
  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, {
    error: { code: "not_found", message: "Not found" }
  });
});

test("missing auth returns unauthorized", async () => {
  const req = { method: "GET", url: "/api/unknown" };
  const res = createRes();
  await route(req, res);
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, {
    error: { code: "unauthorized", message: "Missing bearer token" }
  });
});
