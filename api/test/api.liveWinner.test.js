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
    getUserById: async (userId) => ({
      id: userId,
      role: userId === "winner-1" ? "Bidder" : "AdminL2",
      email: `${userId}@example.com`,
      phone: "555-0002",
      displayName: userId === "winner-1" ? "Winner One" : "Admin 2",
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
    getMembership: async (auctionId, userId) => {
      if (userId === "winner-1") {
        return {
          auctionId,
          userId,
          roleOverride: null,
          status: "active",
          bidderNumber: 7,
          createdAt: "2026-02-13T04:15:00.000Z",
          updatedAt: "2026-02-13T04:15:00.000Z",
        };
      }
      return {
        auctionId,
        userId,
        roleOverride: null,
        status: "active",
        bidderNumber: null,
        createdAt: "2026-02-13T04:15:00.000Z",
        updatedAt: "2026-02-13T04:15:00.000Z",
      };
    },
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
      id: "item-live-1",
      auctionId: "auction-1",
      name: "Live Item",
      description: null,
      type: "live",
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
    upsertLiveWinner: async (input) => ({
      id: input.itemId,
      auctionId: input.auctionId,
      itemId: input.itemId,
      bidderId: input.bidderId,
      finalPrice: input.finalPrice,
      assignedAt: "2026-02-20T19:00:00.000Z",
    }),
    listLiveWinnersForAuction: async () => [],
    createAuditLog: async () => ({id: "audit-1"}),
    getTotals: async () => null,
    upsertTotals: async (input) => ({
      ...input,
      updatedAt: "2026-02-20T19:05:00.000Z",
    }),
    listTotalsForAuction: async () => [],
    createNotification: async () => {
      throw new Error("not used");
    },
    listNotificationsForUser: async () => [],
    markNotificationRead: async () => null,
    markAllNotificationsRead: async () => 0,
    listAuctionsForActor: async () => [],
    listJoinedAuctionsForUser: async () => [],
    getAuctionById: async () => ({
      id: "auction-1",
      name: "Spring Auction",
      status: "Pending",
      timeZone: "America/New_York",
      phaseSchedule: null,
      auctionCode: "ABC123",
      notificationSettings: {inAppEnabled: true},
      paymentUrl: null,
      createdBy: "admin-1",
      createdAt: "2026-02-13T04:00:00.000Z",
      updatedAt: "2026-02-13T04:00:00.000Z",
    }),
    ...overrides,
  };
}

test("POST /items/:id/winner assigns winner and updates totals", async () => {
  const totalsCalls = [];
  const auditCalls = [];
  const handler = createApiHandler(createBaseDeps({
    upsertTotals: async (input) => {
      totalsCalls.push(input);
      return {
        ...input,
        updatedAt: "2026-02-20T19:05:00.000Z",
      };
    },
    createAuditLog: async (input) => {
      auditCalls.push(input);
      return {id: "audit-1"};
    },
  }));

  const req = createMockRequest(
    "POST",
    "/items/item-live-1/winner",
    "Bearer token",
    {bidderId: "winner-1", finalPrice: 250}
  );
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.itemId, "item-live-1");
  assert.equal(res.body.bidderId, "winner-1");
  assert.equal(res.body.finalPrice, 250);
  assert.equal(totalsCalls.length, 1);
  assert.equal(totalsCalls[0].bidderId, "winner-1");
  assert.equal(totalsCalls[0].total, 250);
  assert.equal(auditCalls.length, 1);
  assert.equal(auditCalls[0].action, "live_winner_assigned");
});

test("POST /items/:id/winner returns 409 when auction is before Pending", async () => {
  const handler = createApiHandler(createBaseDeps({
    getAuctionById: async () => ({
      id: "auction-1",
      name: "Spring Auction",
      status: "Open",
      timeZone: "America/New_York",
      phaseSchedule: null,
      auctionCode: "ABC123",
      notificationSettings: {inAppEnabled: true},
      paymentUrl: null,
      createdBy: "admin-1",
      createdAt: "2026-02-13T04:00:00.000Z",
      updatedAt: "2026-02-13T04:00:00.000Z",
    }),
  }));
  const req = createMockRequest(
    "POST",
    "/items/item-live-1/winner",
    "Bearer token",
    {bidderId: "winner-1", finalPrice: 250}
  );
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.error.code, "phase_closed");
});

test("POST /items/:id/winner returns 403 for bidder role", async () => {
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
    "/items/item-live-1/winner",
    "Bearer token",
    {bidderId: "winner-1", finalPrice: 250}
  );
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error.code, "role_forbidden");
});
