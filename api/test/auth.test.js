const test = require("node:test");
const assert = require("node:assert/strict");

const {
  extractBearerToken,
  authenticateRequest,
  isApiErrorResponse,
} = require("../lib/auth.js");

test("extractBearerToken returns token for valid Bearer header", () => {
  const token = extractBearerToken("Bearer abc123");
  assert.equal(token, "abc123");
});

test("extractBearerToken returns null for missing header", () => {
  const token = extractBearerToken(undefined);
  assert.equal(token, null);
});

test("authenticateRequest throws 401 when header is missing", async () => {
  await assert.rejects(
    () => authenticateRequest(undefined, async () => ({uid: "u1"})),
    (error) => {
      assert.equal(isApiErrorResponse(error), true);
      assert.equal(error.status, 401);
      assert.equal(error.body.error.code, "auth_required");
      return true;
    }
  );
});

test("authenticateRequest returns authenticated user for valid token", async () => {
  const user = await authenticateRequest(
    "Bearer valid-token",
    async (token) => ({uid: "user-1", email: `${token}@example.com`})
  );

  assert.deepEqual(user, {
    uid: "user-1",
    email: "valid-token@example.com",
    token: "valid-token",
  });
});
