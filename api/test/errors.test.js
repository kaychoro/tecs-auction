const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildErrorPayload,
  buildErrorResponse,
} = require("../lib/errors.js");

test("buildErrorPayload returns standard format with empty details by default", () => {
  const payload = buildErrorPayload("auth_required", "Missing token");

  assert.deepEqual(payload, {
    error: {
      code: "auth_required",
      message: "Missing token",
      details: {},
    },
  });
});

test("buildErrorPayload includes custom details", () => {
  const payload = buildErrorPayload(
    "phase_closed",
    "Bidding is closed",
    {phase: "Pending"}
  );

  assert.deepEqual(payload, {
    error: {
      code: "phase_closed",
      message: "Bidding is closed",
      details: {phase: "Pending"},
    },
  });
});

test("buildErrorResponse wraps payload with status", () => {
  const response = buildErrorResponse(
    409,
    "outbid",
    "Another bidder placed a higher bid",
    {current_high_bid: 42}
  );

  assert.deepEqual(response, {
    status: 409,
    body: {
      error: {
        code: "outbid",
        message: "Another bidder placed a higher bid",
        details: {current_high_bid: 42},
      },
    },
  });
});
