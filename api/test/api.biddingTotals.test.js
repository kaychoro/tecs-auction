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
      displayName: "Bidder One",
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
    createBid: async (input) => ({
      id: "bid-1",
      ...input,
      placedAt: "2026-02-20T18:00:01.000Z",
    }),
    getCurrentHighBid: async () => null,
    createAuditLog: async () => ({
      id: "audit-1",
      auctionId: "auction-1",
      actorUserId: "bidder-1",
      action: "bid_placed",
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
    createNotification: async (input) => ({
      id: "notification-1",
      ...input,
      createdAt: "2026-02-20T18:00:01.000Z",
      readAt: null,
    }),
    listAuctionsForActor: async () => [],
    listJoinedAuctionsForUser: async () => [],
    getAuctionById: async () => ({
      id: "auction-1",
      name: "Auction 1",
      status: "Open",
      timeZone: "America/Denver",
      auctionCode: "CODE1",
      notificationSettings: {inAppEnabled: true},
      paymentUrl: null,
      createdBy: "admin-1",
      createdAt: "2026-02-13T04:00:00.000Z",
      updatedAt: "2026-02-13T04:00:00.000Z",
    }),
    ...overrides,
  };
}

test("POST /items/:id/bids updates totals on successful bid placement", async () => {
  let totalsInput = null;
  let readCount = 0;
  const handler = createApiHandler(createBaseDeps({
    getCurrentHighBid: async () => {
      readCount += 1;
      if (readCount === 1) {
        return {
          id: "bid-previous",
          auctionId: "auction-1",
          itemId: "item-1",
          bidderId: "bidder-2",
          amount: 90,
          placedAt: "2026-02-20T17:59:59.000Z",
        };
      }
      return {
        id: "bid-1",
        auctionId: "auction-1",
        itemId: "item-1",
        bidderId: "bidder-1",
        amount: 110,
        placedAt: "2026-02-20T18:00:01.000Z",
      };
    },
    createBid: async (input) => ({
      id: "bid-1",
      ...input,
      placedAt: "2026-02-20T18:00:01.000Z",
    }),
    getTotals: async () => ({
      auctionId: "auction-1",
      bidderId: "bidder-1",
      bidderNumber: 7,
      displayName: "Bidder One",
      subtotal: 15,
      total: 15,
      paid: false,
      updatedAt: "2026-02-20T17:50:00.000Z",
    }),
    upsertTotals: async (input) => {
      totalsInput = input;
      return {
        ...input,
        updatedAt: "2026-02-20T18:00:01.000Z",
      };
    },
  }));

  const req = createMockRequest(
    "POST",
    "/items/item-1/bids",
    "Bearer token",
    {amount: 110}
  );
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(totalsInput.subtotal, 125);
  assert.equal(totalsInput.total, 125);
});

test("POST /items/:id/bids does not update totals when outbid race occurs", async () => {
  let totalsCalled = false;
  let readCount = 0;
  const handler = createApiHandler(createBaseDeps({
    getCurrentHighBid: async () => {
      readCount += 1;
      if (readCount === 1) {
        return null;
      }
      return {
        id: "bid-other",
        auctionId: "auction-1",
        itemId: "item-1",
        bidderId: "bidder-2",
        amount: 120,
        placedAt: "2026-02-20T18:00:02.000Z",
      };
    },
    upsertTotals: async (input) => {
      totalsCalled = true;
      return {
        ...input,
        updatedAt: "2026-02-20T18:00:01.000Z",
      };
    },
  }));

  const req = createMockRequest(
    "POST",
    "/items/item-1/bids",
    "Bearer token",
    {amount: 110}
  );
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.error.code, "outbid");
  assert.equal(totalsCalled, false);
});
