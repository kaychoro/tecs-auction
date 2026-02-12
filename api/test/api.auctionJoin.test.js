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
    authenticate: async () => ({uid: "bidder-1"}),
    getUserById: async () => ({
      id: "bidder-1",
      role: "Bidder",
      email: "bidder@example.com",
      phone: "555-0010",
      displayName: "Bidder",
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
    updateAuctionNotifications: async () => {
      throw new Error("not used");
    },
    findAuctionsByCode: async () => [{
      id: "auction-1",
      name: "Auction 1",
      status: "Setup",
      timeZone: "America/Denver",
      auctionCode: "JOIN1",
      notificationSettings: {inAppEnabled: true},
      paymentUrl: null,
      createdBy: "admin-1",
      createdAt: "2026-02-13T04:00:00.000Z",
      updatedAt: "2026-02-13T04:10:00.000Z",
    }],
    getMembership: async () => null,
    allocateBidderNumber: async () => 1,
    createMembership: async () => ({
      auctionId: "auction-1",
      userId: "bidder-1",
      roleOverride: null,
      status: "active",
      bidderNumber: 1,
      createdAt: "2026-02-13T04:15:00.000Z",
      updatedAt: "2026-02-13T04:15:00.000Z",
    }),
    listAuctionsForActor: async () => [],
    listJoinedAuctionsForUser: async () => [],
    getAuctionById: async () => null,
    ...overrides,
  };
}

test("POST /auctions/:id/join creates membership with valid auction code", async () => {
  const handler = createApiHandler(createBaseDeps());
  const req = createMockRequest(
    "POST",
    "/auctions/auction-1/join",
    "Bearer token",
    {auctionCode: "JOIN1"}
  );
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    auctionId: "auction-1",
    userId: "bidder-1",
    bidderNumber: 1,
    roleOverride: null,
  });
});

test("POST /auctions/:id/join returns 403 for AdminL1", async () => {
  const handler = createApiHandler(createBaseDeps({
    getUserById: async () => ({
      id: "admin-1",
      role: "AdminL1",
      email: "admin@example.com",
      phone: "555-0001",
      displayName: "Admin",
      createdAt: "2026-02-13T04:00:00.000Z",
      updatedAt: "2026-02-13T04:00:00.000Z",
    }),
  }));
  const req = createMockRequest(
    "POST",
    "/auctions/auction-1/join",
    "Bearer token",
    {auctionCode: "JOIN1"}
  );
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error.code, "role_forbidden");
});

test("POST /auctions/:id/join returns 400 when auctionCode is missing", async () => {
  const handler = createApiHandler(createBaseDeps());
  const req = createMockRequest(
    "POST",
    "/auctions/auction-1/join",
    "Bearer token",
    {}
  );
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error.code, "validation_error");
});

test("POST /auctions/:id/join returns 404 when auctionCode is invalid", async () => {
  const handler = createApiHandler(createBaseDeps({
    findAuctionsByCode: async () => [],
  }));
  const req = createMockRequest(
    "POST",
    "/auctions/auction-1/join",
    "Bearer token",
    {auctionCode: "MISSING"}
  );
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.error.code, "auction_not_found");
});

test("POST /auctions/:id/join returns 409 for duplicate auction code mapping", async () => {
  const handler = createApiHandler(createBaseDeps({
    findAuctionsByCode: async () => [
      {id: "auction-1"},
      {id: "auction-2"},
    ],
  }));
  const req = createMockRequest(
    "POST",
    "/auctions/auction-1/join",
    "Bearer token",
    {auctionCode: "DUPLICATE"}
  );
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.error.code, "auction_code_conflict");
});

test("POST /auctions/:id/join returns 409 when membership already exists", async () => {
  const handler = createApiHandler(createBaseDeps({
    getMembership: async () => ({
      auctionId: "auction-1",
      userId: "bidder-1",
      roleOverride: null,
      status: "active",
      bidderNumber: 17,
      createdAt: "2026-02-13T04:10:00.000Z",
      updatedAt: "2026-02-13T04:10:00.000Z",
    }),
  }));
  const req = createMockRequest(
    "POST",
    "/auctions/auction-1/join",
    "Bearer token",
    {auctionCode: "JOIN1"}
  );
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.error.code, "membership_exists");
});
