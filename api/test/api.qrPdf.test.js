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
        id: "item-1",
        auctionId: "auction-1",
        name: "Item 1",
        description: null,
        type: "silent",
        startingPrice: 10,
        image: null,
        createdAt: "2026-02-13T04:15:00.000Z",
        updatedAt: "2026-02-13T04:20:00.000Z",
      },
      {
        id: "item-2",
        auctionId: "auction-1",
        name: "Item 2",
        description: null,
        type: "silent",
        startingPrice: 20,
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

test("GET /auctions/:id/items/qr-pdf returns one page marker per item", async () => {
  const handler = createApiHandler(createBaseDeps());
  const req = createMockRequest(
    "GET",
    "/auctions/auction-1/items/qr-pdf",
    "Bearer token"
  );
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["Content-Type"], "application/pdf");
  assert.ok(Buffer.isBuffer(res.body));
  const payload = res.body.toString("utf8");
  assert.match(payload, /%%Page: 1/);
  assert.match(payload, /%%Page: 2/);
});
