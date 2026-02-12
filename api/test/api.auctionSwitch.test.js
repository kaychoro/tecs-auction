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
    findAuctionsByCode: async () => [],
    getMembership: async () => ({
      auctionId: "auction-1",
      userId: "bidder-1",
      roleOverride: null,
      status: "active",
      bidderNumber: 7,
      createdAt: "2026-02-13T04:15:00.000Z",
      updatedAt: "2026-02-13T04:15:00.000Z",
    }),
    createMembership: async () => {
      throw new Error("not used");
    },
    allocateBidderNumber: async () => 1,
    updateUserLastAuctionId: async () => ({
      id: "bidder-1",
      role: "Bidder",
      email: "bidder@example.com",
      phone: "555-0010",
      displayName: "Bidder",
      lastAuctionId: "auction-1",
      createdAt: "2026-02-13T04:00:00.000Z",
      updatedAt: "2026-02-13T04:15:00.000Z",
    }),
    listAuctionsForActor: async () => [],
    listJoinedAuctionsForUser: async () => [],
    getAuctionById: async () => null,
    ...overrides,
  };
}

test("POST /auctions/:id/switch updates lastAuctionId for active member", async () => {
  let updatedUserId = null;
  let updatedAuctionId = null;
  const handler = createApiHandler(createBaseDeps({
    updateUserLastAuctionId: async (userId, auctionId) => {
      updatedUserId = userId;
      updatedAuctionId = auctionId;
      return {
        id: userId,
        role: "Bidder",
        email: "bidder@example.com",
        phone: "555-0010",
        displayName: "Bidder",
        lastAuctionId: auctionId,
        createdAt: "2026-02-13T04:00:00.000Z",
        updatedAt: "2026-02-13T04:15:00.000Z",
      };
    },
  }));
  const req = createMockRequest(
    "POST",
    "/auctions/auction-1/switch",
    "Bearer token"
  );
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {auctionId: "auction-1"});
  assert.equal(updatedUserId, "bidder-1");
  assert.equal(updatedAuctionId, "auction-1");
});

test("POST /auctions/:id/switch returns 403 when user is not an active member", async () => {
  const handler = createApiHandler(createBaseDeps({
    getMembership: async () => null,
  }));
  const req = createMockRequest(
    "POST",
    "/auctions/auction-1/switch",
    "Bearer token"
  );
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error.code, "role_forbidden");
});

