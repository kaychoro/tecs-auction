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
    listItemsByAuction: async () => [
      {
        id: "item-1",
        auctionId: "auction-1",
        name: "Gift Basket",
        description: null,
        type: "silent",
        startingPrice: 50,
        image: null,
        createdAt: "2026-02-13T04:15:00.000Z",
        updatedAt: "2026-02-13T04:20:00.000Z",
      },
    ],
    updateItem: async () => {
      throw new Error("not used");
    },
    listAuctionsForActor: async () => [],
    listJoinedAuctionsForUser: async () => [],
    getAuctionById: async () => null,
    ...overrides,
  };
}

test("GET /auctions/:id/items returns list for active auction member", async () => {
  const handler = createApiHandler(createBaseDeps());
  const req = createMockRequest(
    "GET",
    "/auctions/auction-1/items",
    "Bearer token"
  );
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.total, 1);
  assert.equal(res.body.data[0].id, "item-1");
});

test("GET /auctions/:id/items returns 403 when user lacks membership", async () => {
  const handler = createApiHandler(createBaseDeps({
    getMembership: async () => null,
  }));
  const req = createMockRequest(
    "GET",
    "/auctions/auction-1/items",
    "Bearer token"
  );
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error.code, "role_forbidden");
});

test("GET /items/:id returns item detail for active auction member", async () => {
  const handler = createApiHandler(createBaseDeps());
  const req = createMockRequest(
    "GET",
    "/items/item-1",
    "Bearer token"
  );
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.id, "item-1");
  assert.equal(res.body.name, "Gift Basket");
});

test("GET /items/:id returns 404 when item is missing", async () => {
  const handler = createApiHandler(createBaseDeps({
    getItemById: async () => null,
  }));
  const req = createMockRequest(
    "GET",
    "/items/missing-item",
    "Bearer token"
  );
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.error.code, "item_not_found");
});
