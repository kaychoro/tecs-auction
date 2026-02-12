const test = require("node:test");
const assert = require("node:assert/strict");

const {mapHttpError} = require("../lib/httpErrors.js");

test("maps auth_required reason to 401", () => {
  const result = mapHttpError(
    "auth_required",
    "auth_required",
    "Missing or invalid token"
  );

  assert.equal(result.status, 401);
  assert.equal(result.body.error.code, "auth_required");
});

test("maps role_forbidden reason to 403", () => {
  const result = mapHttpError(
    "role_forbidden",
    "role_forbidden",
    "User does not have access"
  );

  assert.equal(result.status, 403);
});

test("maps validation reason to 400", () => {
  const result = mapHttpError(
    "validation",
    "bid_too_low",
    "Bid must be higher",
    {current_high_bid: 42}
  );

  assert.equal(result.status, 400);
  assert.deepEqual(result.body.error.details, {current_high_bid: 42});
});

test("maps conflict reason to 409", () => {
  const result = mapHttpError("conflict", "outbid", "Another bid won");
  assert.equal(result.status, 409);
});

test("maps rate_limited reason to 429", () => {
  const result = mapHttpError(
    "rate_limited",
    "verification_throttled",
    "Too many requests"
  );
  assert.equal(result.status, 429);
});
