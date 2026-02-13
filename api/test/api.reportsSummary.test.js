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
    getMembership: async () => ({
      auctionId: "auction-1",
      userId: "admin-2",
      roleOverride: null,
      status: "active",
      bidderNumber: null,
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
    getItemById: async () => null,
    listItemsByAuction: async () => [
      {
        id: "item-silent-1",
        auctionId: "auction-1",
        name: "Silent Item",
        description: null,
        type: "silent",
        startingPrice: 25,
        image: null,
        createdAt: "2026-02-13T04:15:00.000Z",
        updatedAt: "2026-02-13T04:20:00.000Z",
      },
      {
        id: "item-live-1",
        auctionId: "auction-1",
        name: "Live Item",
        description: null,
        type: "live",
        startingPrice: 100,
        image: null,
        createdAt: "2026-02-13T04:15:00.000Z",
        updatedAt: "2026-02-13T04:20:00.000Z",
      },
    ],
    updateItem: async () => null,
    deleteItem: async () => false,
    createImage: async () => {
      throw new Error("not used");
    },
    createBid: async () => {
      throw new Error("not used");
    },
    listBidsForItem: async () => [],
    getBidById: async () => null,
    deleteBid: async () => false,
    getCurrentHighBid: async (itemId) => {
      if (itemId === "item-silent-1") {
        return {
          id: "bid-1",
          auctionId: "auction-1",
          itemId,
          bidderId: "bidder-1",
          amount: 100,
          placedAt: "2026-02-20T18:00:00.000Z",
        };
      }
      return null;
    },
    getLiveWinnerByItemId: async () => null,
    upsertLiveWinner: async () => {
      throw new Error("not used");
    },
    listLiveWinnersForAuction: async () => [
      {
        id: "item-live-1",
        auctionId: "auction-1",
        itemId: "item-live-1",
        bidderId: "bidder-2",
        finalPrice: 300,
        assignedAt: "2026-02-20T19:00:00.000Z",
      },
    ],
    createAuditLog: async () => {
      throw new Error("not used");
    },
    getTotals: async () => null,
    upsertTotals: async () => {
      throw new Error("not used");
    },
    listTotalsForAuction: async () => [
      {bidderId: "bidder-1"},
      {bidderId: "bidder-2"},
    ],
    createNotification: async () => {
      throw new Error("not used");
    },
    listNotificationsForUser: async () => [],
    markNotificationRead: async () => null,
    markAllNotificationsRead: async () => 0,
    listAuctionsForActor: async () => [],
    listJoinedAuctionsForUser: async () => [],
    getAuctionById: async () => null,
    ...overrides,
  };
}

test("GET /auctions/:id/reports returns summary report for admin", async () => {
  const handler = createApiHandler(createBaseDeps());
  const req = createMockRequest(
    "GET",
    "/auctions/auction-1/reports",
    "Bearer token"
  );
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.auctionId, "auction-1");
  assert.equal(res.body.totals.bidderCount, 2);
  assert.equal(res.body.totals.itemsCount, 2);
  assert.equal(res.body.totals.itemsSoldCount, 2);
  assert.equal(res.body.totals.grossTotal, 400);
});

test("GET /auctions/:id/reports returns 403 for bidder role", async () => {
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
    "/auctions/auction-1/reports",
    "Bearer token"
  );
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error.code, "role_forbidden");
});
