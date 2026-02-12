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
    createItem: async (input) => ({
      id: "item-1",
      auctionId: input.auctionId,
      name: input.name,
      description: input.description || null,
      type: input.type,
      startingPrice: input.startingPrice,
      image: null,
      createdAt: "2026-02-13T04:15:00.000Z",
      updatedAt: "2026-02-13T04:15:00.000Z",
    }),
    getItemById: async () => ({
      id: "item-1",
      auctionId: "auction-1",
      name: "Original",
      description: null,
      type: "silent",
      startingPrice: 25,
      image: null,
      createdAt: "2026-02-13T04:15:00.000Z",
      updatedAt: "2026-02-13T04:15:00.000Z",
    }),
    updateItem: async (_itemId, updates) => ({
      id: "item-1",
      auctionId: "auction-1",
      name: updates.name || "Original",
      description: Object.prototype.hasOwnProperty.call(updates, "description") ?
        updates.description :
        null,
      type: updates.type || "silent",
      startingPrice: typeof updates.startingPrice === "number" ?
        updates.startingPrice :
        25,
      image: null,
      createdAt: "2026-02-13T04:15:00.000Z",
      updatedAt: "2026-02-13T04:20:00.000Z",
    }),
    listAuctionsForActor: async () => [{id: "auction-1"}],
    listJoinedAuctionsForUser: async () => [],
    getAuctionById: async () => ({
      id: "auction-1",
      name: "Auction 1",
      status: "Setup",
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

test("POST /auctions/:id/items creates item for AdminL2 with auction access", async () => {
  const handler = createApiHandler(createBaseDeps());
  const req = createMockRequest(
    "POST",
    "/auctions/auction-1/items",
    "Bearer token",
    {
      name: "Gift Basket",
      description: "Premium basket",
      type: "silent",
      startingPrice: 50,
    }
  );
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.name, "Gift Basket");
  assert.equal(res.body.startingPrice, 50);
});

test("POST /auctions/:id/items returns 400 when required fields are missing", async () => {
  const handler = createApiHandler(createBaseDeps());
  const req = createMockRequest(
    "POST",
    "/auctions/auction-1/items",
    "Bearer token",
    {
      type: "silent",
      startingPrice: 50,
    }
  );
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error.code, "validation_error");
});

test("POST /auctions/:id/items returns 403 for bidder role", async () => {
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
    "/auctions/auction-1/items",
    "Bearer token",
    {
      name: "Gift Basket",
      type: "silent",
      startingPrice: 50,
    }
  );
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error.code, "role_forbidden");
});

test("PATCH /items/:id updates item for AdminL2", async () => {
  const handler = createApiHandler(createBaseDeps());
  const req = createMockRequest(
    "PATCH",
    "/items/item-1",
    "Bearer token",
    {
      name: "Updated Gift Basket",
      startingPrice: 75,
    }
  );
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.name, "Updated Gift Basket");
  assert.equal(res.body.startingPrice, 75);
});

test("PATCH /items/:id returns 400 when no fields are provided", async () => {
  const handler = createApiHandler(createBaseDeps());
  const req = createMockRequest(
    "PATCH",
    "/items/item-1",
    "Bearer token",
    {}
  );
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error.code, "validation_error");
});

test("PATCH /items/:id returns 404 when item is missing", async () => {
  const handler = createApiHandler(createBaseDeps({
    getItemById: async () => null,
  }));
  const req = createMockRequest(
    "PATCH",
    "/items/missing-item",
    "Bearer token",
    {name: "Updated Gift Basket"}
  );
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.error.code, "item_not_found");
});
