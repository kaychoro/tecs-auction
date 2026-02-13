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
    authenticate: async () => ({uid: "admin-2"}),
    getUserById: async () => ({
      id: "admin-2",
      role: "AdminL2",
      email: "admin2@example.com",
      phone: "555-0002",
      displayName: "Admin 2",
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
    getMembership: async () => null,
    createMembership: async () => {
      throw new Error("not used");
    },
    allocateBidderNumber: async () => 1,
    updateUserLastAuctionId: async () => {
      throw new Error("not used");
    },
    createItem: async () => {
      throw new Error("not used");
    },
    getItemById: async () => ({
      id: "item-1",
      auctionId: "auction-1",
      name: "Gift Basket",
      description: null,
      type: "silent",
      startingPrice: 50,
      image: null,
      createdAt: "2026-02-13T04:15:00.000Z",
      updatedAt: "2026-02-13T04:20:00.000Z",
    }),
    listItemsByAuction: async () => [],
    updateItem: async () => null,
    deleteItem: async () => true,
    createImage: async () => {
      throw new Error("not used");
    },
    createBid: async () => {
      throw new Error("not used");
    },
    listBidsForItem: async () => [
      {
        id: "bid-2",
        auctionId: "auction-1",
        itemId: "item-1",
        bidderId: "bidder-2",
        amount: 120,
        placedAt: "2026-02-20T18:00:02.000Z",
      },
      {
        id: "bid-1",
        auctionId: "auction-1",
        itemId: "item-1",
        bidderId: "bidder-1",
        amount: 120,
        placedAt: "2026-02-20T18:00:01.000Z",
      },
      {
        id: "bid-3",
        auctionId: "auction-1",
        itemId: "item-1",
        bidderId: "bidder-3",
        amount: 110,
        placedAt: "2026-02-20T18:00:00.000Z",
      },
    ],
    getCurrentHighBid: async () => null,
    createAuditLog: async () => ({
      id: "audit-1",
      auctionId: "auction-1",
      actorUserId: "admin-2",
      action: "noop",
      targetType: "item",
      targetId: "item-1",
      metadata: {},
      createdAt: "2026-02-20T18:00:01.000Z",
    }),
    getTotals: async () => null,
    upsertTotals: async (input) => ({
      ...input,
      updatedAt: "2026-02-20T18:00:01.000Z",
    }),
    listAuctionsForActor: async () => [{id: "auction-1"}],
    listJoinedAuctionsForUser: async () => [],
    getAuctionById: async () => null,
    ...overrides,
  };
}

test("GET /items/:id/bids returns admin-sorted bids", async () => {
  const handler = createApiHandler(createBaseDeps());
  const req = createMockRequest(
    "GET",
    "/items/item-1/bids",
    "Bearer token"
  );
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data[0].id, "bid-1");
  assert.equal(res.body.data[1].id, "bid-2");
  assert.equal(res.body.data[2].id, "bid-3");
});

test("GET /items/:id/bids returns 403 for bidder role", async () => {
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
    "GET",
    "/items/item-1/bids",
    "Bearer token"
  );
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error.code, "role_forbidden");
});
