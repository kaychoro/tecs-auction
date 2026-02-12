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
    createAuction: async () => {
      throw new Error("not used");
    },
    updateAuction: async () => {
      throw new Error("not used");
    },
    updateAuctionCode: async () => {
      throw new Error("not used");
    },
    updateAuctionPhase: async () => {
      throw new Error("not used");
    },
    updateAuctionNotifications: async (_auctionId, updates) => ({
      id: "auction-1",
      name: "Auction 1",
      status: "Setup",
      timeZone: "America/Denver",
      auctionCode: "CODE1",
      notificationSettings: {inAppEnabled: updates.inAppEnabled},
      paymentUrl: null,
      createdBy: "admin-1",
      createdAt: "2026-02-13T04:00:00.000Z",
      updatedAt: "2026-02-13T04:10:00.000Z",
    }),
    listAuctionsForActor: async () => [],
    listJoinedAuctionsForUser: async () => [],
    getAuctionById: async () => null,
    ...overrides,
  };
}

test("PATCH /auctions/:id/notifications updates settings for AdminL1", async () => {
  const handler = createApiHandler(createBaseDeps());
  const req = createMockRequest(
    "PATCH",
    "/auctions/auction-1/notifications",
    "Bearer token",
    {inAppEnabled: false}
  );
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.notificationSettings.inAppEnabled, false);
});

test("PATCH /auctions/:id/notifications returns 400 when field missing", async () => {
  const handler = createApiHandler(createBaseDeps());
  const req = createMockRequest(
    "PATCH",
    "/auctions/auction-1/notifications",
    "Bearer token",
    {}
  );
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error.code, "validation_error");
});

test("PATCH /auctions/:id/notifications returns 403 for non-L1 role", async () => {
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
    "/auctions/auction-1/notifications",
    "Bearer token",
    {inAppEnabled: true}
  );
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error.code, "role_forbidden");
});

test("PATCH /auctions/:id/notifications returns 404 when auction missing", async () => {
  const handler = createApiHandler(createBaseDeps({
    updateAuctionNotifications: async () => null,
  }));
  const req = createMockRequest(
    "PATCH",
    "/auctions/missing/notifications",
    "Bearer token",
    {inAppEnabled: true}
  );
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.error.code, "auction_not_found");
});
