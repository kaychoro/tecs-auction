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
    updateItem: async (_id, updates) => ({
      id: "item-1",
      auctionId: "auction-1",
      name: "Gift Basket",
      description: null,
      type: "silent",
      startingPrice: 50,
      image: updates.image || null,
      createdAt: "2026-02-13T04:15:00.000Z",
      updatedAt: "2026-02-13T04:20:00.000Z",
    }),
    deleteItem: async () => true,
    createImage: async (input) => ({
      id: "image-1",
      ...input,
      createdAt: "2026-02-13T04:25:00.000Z",
      updatedAt: "2026-02-13T04:25:00.000Z",
    }),
    listAuctionsForActor: async () => [{id: "auction-1"}],
    listJoinedAuctionsForUser: async () => [],
    getAuctionById: async () => null,
    ...overrides,
  };
}

test("POST /items/:id/image stores metadata for valid image", async () => {
  const handler = createApiHandler(createBaseDeps());
  const req = createMockRequest(
    "POST",
    "/items/item-1/image",
    "Bearer token",
    {
      contentType: "image/jpeg",
      sizeBytes: 1024,
      storagePath: "images/item-1/original.jpg",
      originalWidth: 1200,
      originalHeight: 800,
    }
  );
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.id, "image-1");
});

test("POST /items/:id/image rejects unsupported content type", async () => {
  const handler = createApiHandler(createBaseDeps());
  const req = createMockRequest(
    "POST",
    "/items/item-1/image",
    "Bearer token",
    {
      contentType: "application/pdf",
      sizeBytes: 1024,
      storagePath: "images/item-1/original.pdf",
      originalWidth: 1200,
      originalHeight: 800,
    }
  );
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error.code, "validation_error");
});

test("POST /items/:id/image rejects oversized image", async () => {
  const handler = createApiHandler(createBaseDeps());
  const req = createMockRequest(
    "POST",
    "/items/item-1/image",
    "Bearer token",
    {
      contentType: "image/png",
      sizeBytes: 15 * 1024 * 1024,
      storagePath: "images/item-1/original.png",
      originalWidth: 1200,
      originalHeight: 800,
    }
  );
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error.code, "validation_error");
});
