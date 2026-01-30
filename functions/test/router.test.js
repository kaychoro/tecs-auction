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

test("GET /api/health returns ok", () => {
  const req = { method: "GET", url: "/api/health" };
  const res = createRes();
  route(req, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { status: "ok" });
});

test("POST /api/health returns method_not_allowed", () => {
  const req = { method: "POST", url: "/api/health" };
  const res = createRes();
  route(req, res);
  assert.equal(res.statusCode, 405);
  assert.deepEqual(res.body, {
    error: { code: "method_not_allowed", message: "Method not allowed" }
  });
});

test("unknown route returns not_found", () => {
  const req = { method: "GET", url: "/api/unknown" };
  const res = createRes();
  route(req, res);
  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, {
    error: { code: "not_found", message: "Not found" }
  });
});
