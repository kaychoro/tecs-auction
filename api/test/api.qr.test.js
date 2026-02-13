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
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    set(name, value) {
      this.headers[name] = value;
      return this;
    },
    send(payload) {
      this.body = payload;
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
      bidderNumber: 4,
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
    getCurrentHighBid: async () => null,
    getLiveWinnerByItemId: async () => null,
    upsertLiveWinner: async () => {
      throw new Error("not used");
    },
    listLiveWinnersForAuction: async () => [],
    createAuditLog: async () => {
      throw new Error("not used");
    },
    getTotals: async () => null,
    upsertTotals: async () => {
      throw new Error("not used");
    },
    listTotalsForAuction: async () => [],
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

test("GET /items/:id/qr returns PNG payload with deep link for member", async () => {
  const handler = createApiHandler(createBaseDeps());
  const req = createMockRequest("GET", "/items/item-1/qr", "Bearer token");
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["Content-Type"], "image/png");
  assert.ok(Buffer.isBuffer(res.body));
  assert.match(
    res.body.toString("utf8"),
    /https:\/\/tecs-auction\.app\/items\/item-1/
  );
});

test("GET /items/:id/qr returns 403 when user lacks membership", async () => {
  const handler = createApiHandler(createBaseDeps({
    getMembership: async () => null,
  }));
  const req = createMockRequest("GET", "/items/item-1/qr", "Bearer token");
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error.code, "role_forbidden");
});
