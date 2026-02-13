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
    getItemById: async () => null,
    listItemsByAuction: async () => [],
    updateItem: async () => null,
    deleteItem: async () => true,
    createImage: async () => {
      throw new Error("not used");
    },
    createBid: async () => {
      throw new Error("not used");
    },
    listBidsForItem: async () => [],
    getBidById: async () => ({
      id: "bid-1",
      auctionId: "auction-1",
      itemId: "item-1",
      bidderId: "bidder-1",
      amount: 120,
      placedAt: "2026-02-20T18:00:01.000Z",
    }),
    deleteBid: async () => true,
    getCurrentHighBid: async () => null,
    createAuditLog: async (input) => ({
      id: "audit-1",
      ...input,
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

test("DELETE /bids/:id removes bid for admin and writes audit log", async () => {
  let auditAction = null;
  const handler = createApiHandler(createBaseDeps({
    createAuditLog: async (input) => {
      auditAction = input.action;
      return {
        id: "audit-1",
        ...input,
        createdAt: "2026-02-20T18:00:01.000Z",
      };
    },
  }));
  const req = createMockRequest(
    "DELETE",
    "/bids/bid-1",
    "Bearer token"
  );
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.deleted, true);
  assert.equal(auditAction, "bid_deleted");
});

test("DELETE /bids/:id returns 403 for bidder role", async () => {
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
    "DELETE",
    "/bids/bid-1",
    "Bearer token"
  );
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error.code, "role_forbidden");
});
