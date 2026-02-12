const test = require("node:test");
const assert = require("node:assert/strict");

const {createApiHandler} = require("../lib/api.js");

function createMockRequest(method, path, authorizationHeader, body = {}) {
  return {
    method,
    path,
    body,
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

function createBaseDeps(overrides = {}) {
  return {
    authenticate: async () => ({uid: "admin-1"}),
    getUserById: async () => ({
      id: "admin-1",
      role: "AdminL1",
      email: "admin@example.com",
      phone: "555-0001",
      displayName: "Admin",
      createdAt: "2026-02-13T04:00:00.000Z",
      updatedAt: "2026-02-13T04:00:00.000Z",
    }),
    createAuction: async (input) => ({
      id: "auction-1",
      ...input,
      notificationSettings: {inAppEnabled: true},
      createdAt: "2026-02-13T04:00:00.000Z",
      updatedAt: "2026-02-13T04:00:00.000Z",
    }),
    updateAuction: async (_id, updates) => ({
      id: "auction-1",
      name: "Updated",
      status: "Setup",
      timeZone: "America/Denver",
      auctionCode: "CODE1",
      paymentUrl: null,
      notificationSettings: {inAppEnabled: true},
      createdBy: "admin-1",
      createdAt: "2026-02-13T04:00:00.000Z",
      updatedAt: "2026-02-13T04:05:00.000Z",
      ...updates,
    }),
    ...overrides,
  };
}

test("POST /auctions creates auction for AdminL1", async () => {
  const handler = createApiHandler(createBaseDeps());
  const req = createMockRequest(
    "POST",
    "/auctions",
    "Bearer token",
    {
      name: "Spring Gala",
      timeZone: "America/Denver",
      auctionCode: "GALA26",
    }
  );
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.name, "Spring Gala");
  assert.equal(res.body.auctionCode, "GALA26");
});

test("POST /auctions returns 400 when required fields are missing", async () => {
  const handler = createApiHandler(createBaseDeps());
  const req = createMockRequest(
    "POST",
    "/auctions",
    "Bearer token",
    {
      timeZone: "America/Denver",
      auctionCode: "GALA26",
    }
  );
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error.code, "validation_error");
});

test("PATCH /auctions/:id updates auction for AdminL2", async () => {
  const handler = createApiHandler(createBaseDeps({
    getUserById: async () => ({
      id: "admin-2",
      role: "AdminL2",
      email: "admin2@example.com",
      phone: "555-0002",
      displayName: "Admin 2",
      createdAt: "2026-02-13T04:00:00.000Z",
      updatedAt: "2026-02-13T04:00:00.000Z",
    }),
  }));

  const req = createMockRequest(
    "PATCH",
    "/auctions/auction-1",
    "Bearer token",
    {
      name: "Updated Name",
    }
  );
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.name, "Updated Name");
});

test("PATCH /auctions/:id returns 400 when no fields are provided", async () => {
  const handler = createApiHandler(createBaseDeps());
  const req = createMockRequest(
    "PATCH",
    "/auctions/auction-1",
    "Bearer token",
    {}
  );
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error.code, "validation_error");
});

test("PATCH /auctions/:id returns 404 when auction is missing", async () => {
  const handler = createApiHandler(createBaseDeps({
    updateAuction: async () => null,
  }));
  const req = createMockRequest(
    "PATCH",
    "/auctions/missing-auction",
    "Bearer token",
    {name: "Updated Name"}
  );
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.error.code, "auction_not_found");
});

test("POST /auctions returns 403 for bidder role", async () => {
  const handler = createApiHandler(createBaseDeps({
    getUserById: async () => ({
      id: "bidder-1",
      role: "Bidder",
      email: "bidder@example.com",
      phone: "555-0010",
      displayName: "Bidder",
      createdAt: "2026-02-13T04:00:00.000Z",
      updatedAt: "2026-02-13T04:00:00.000Z",
    }),
  }));
  const req = createMockRequest(
    "POST",
    "/auctions",
    "Bearer token",
    {
      name: "Blocked Auction",
      timeZone: "America/Denver",
      auctionCode: "BLOCK",
    }
  );
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error.code, "role_forbidden");
});
