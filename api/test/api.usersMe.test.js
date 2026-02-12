const test = require("node:test");
const assert = require("node:assert/strict");

const {createApiHandler} = require("../lib/api.js");

function createMockRequest(method, path, authorizationHeader) {
  return {
    method,
    path,
    header(name) {
      if (name.toLowerCase() === "authorization") {
        return authorizationHeader;
      }
      return undefined;
    },
  };
}

function createMockResponse() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test("GET /users/me returns user profile for authenticated user", async () => {
  const handler = createApiHandler({
    authenticate: async () => ({uid: "user-1"}),
    getUserById: async () => ({
      id: "user-1",
      role: "Bidder",
      email: "user1@example.com",
      phone: "555-0001",
      displayName: "User One",
      emailVerifiedAt: null,
      lastAuctionId: "auction-1",
      createdAt: "2026-02-13T04:00:00.000Z",
      updatedAt: "2026-02-13T04:00:00.000Z",
    }),
  });
  const req = createMockRequest("GET", "/users/me", "Bearer token");
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.id, "user-1");
  assert.equal(res.body.displayName, "User One");
});

test("GET /users/me returns 404 when profile is missing", async () => {
  const handler = createApiHandler({
    authenticate: async () => ({uid: "missing-user"}),
    getUserById: async () => null,
  });
  const req = createMockRequest("GET", "/users/me", "Bearer token");
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.error.code, "user_not_found");
});

test("GET /users/me returns 401 on auth failure", async () => {
  const handler = createApiHandler({
    authenticate: async () => {
      throw {
        status: 401,
        body: {
          error: {
            code: "auth_required",
            message: "Missing or invalid token",
            details: {},
          },
        },
      };
    },
    getUserById: async () => null,
  });
  const req = createMockRequest("GET", "/users/me", undefined);
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error.code, "auth_required");
});
