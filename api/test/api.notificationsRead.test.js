const test = require("node:test");
const assert = require("node:assert/strict");

const {createApiHandler} = require("../lib/api.js");

function createMockRequest(
  method,
  path,
  authorizationHeader,
  body = {},
  query = {}
) {
  return {
    method,
    path,
    body,
    query,
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
    getItemById: async () => null,
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
    createAuditLog: async () => {
      throw new Error("not used");
    },
    getTotals: async () => null,
    upsertTotals: async () => {
      throw new Error("not used");
    },
    createNotification: async () => {
      throw new Error("not used");
    },
    listNotificationsForUser: async () => [
      {
        id: "n1",
        auctionId: "auction-1",
        userId: "bidder-1",
        type: "outbid",
        message: "m1",
        refType: "item",
        refId: "item-1",
        createdAt: "2026-02-20T18:00:01.000Z",
        readAt: null,
      },
      {
        id: "n2",
        auctionId: "auction-1",
        userId: "bidder-1",
        type: "outbid",
        message: "m2",
        refType: "item",
        refId: "item-2",
        createdAt: "2026-02-20T18:00:05.000Z",
        readAt: null,
      },
    ],
    markNotificationRead: async (notificationId, readAt) => ({
      id: notificationId,
      auctionId: "auction-1",
      userId: "bidder-1",
      type: "outbid",
      message: "m",
      refType: "item",
      refId: "item-1",
      createdAt: "2026-02-20T18:00:01.000Z",
      readAt,
    }),
    markAllNotificationsRead: async () => 2,
    listAuctionsForActor: async () => [],
    listJoinedAuctionsForUser: async () => [],
    getAuctionById: async () => null,
    ...overrides,
  };
}

test("GET /notifications returns sorted notifications with paging", async () => {
  const handler = createApiHandler(createBaseDeps());
  const req = createMockRequest(
    "GET",
    "/notifications",
    "Bearer token",
    {},
    {page: "1", pageSize: "2"}
  );
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data[0].id, "n2");
  assert.equal(res.body.data[1].id, "n1");
});

test("PATCH /notifications/:id marks notification as read", async () => {
  const handler = createApiHandler(createBaseDeps());
  const req = createMockRequest(
    "PATCH",
    "/notifications/n1",
    "Bearer token"
  );
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.id, "n1");
  assert.ok(res.body.readAt);
});

test("PATCH /notifications/mark-all-read marks all user notifications", async () => {
  const handler = createApiHandler(createBaseDeps());
  const req = createMockRequest(
    "PATCH",
    "/notifications/mark-all-read",
    "Bearer token"
  );
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.updatedCount, 2);
});
