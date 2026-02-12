const test = require("node:test");
const assert = require("node:assert/strict");

const {createApiHandler} = require("../lib/api.js");

function createMockRequest(method, path, authorizationHeader) {
  return {
    method,
    path,
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
    authenticate: async () => ({uid: "actor-1"}),
    getUserById: async () => ({
      id: "actor-1",
      role: "AdminL1",
      email: "admin@example.com",
      phone: "555-0001",
      displayName: "Admin",
      createdAt: "2026-02-13T04:00:00.000Z",
      updatedAt: "2026-02-13T04:00:00.000Z",
    }),
    createAuction: async () => {
      throw new Error("not used");
    },
    updateAuction: async () => {
      throw new Error("not used");
    },
    listAuctionsForActor: async () => ([
      {id: "auction-1", name: "A1"},
      {id: "auction-2", name: "A2"},
    ]),
    getAuctionById: async (id) => ({id, name: `Auction ${id}`}),
    ...overrides,
  };
}

test("GET /auctions returns role-scoped list", async () => {
  const handler = createApiHandler(createBaseDeps());
  const req = createMockRequest("GET", "/auctions", "Bearer token");
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.total, 2);
  assert.equal(res.body.data[0].id, "auction-1");
});

test("GET /auctions returns scoped data for non-L1 actors", async () => {
  const handler = createApiHandler(createBaseDeps({
    getUserById: async () => ({
      id: "actor-2",
      role: "AdminL2",
      email: "admin2@example.com",
      phone: "555-0002",
      displayName: "Admin 2",
      createdAt: "2026-02-13T04:00:00.000Z",
      updatedAt: "2026-02-13T04:00:00.000Z",
    }),
    listAuctionsForActor: async () => ([{id: "auction-2", name: "A2"}]),
  }));
  const req = createMockRequest("GET", "/auctions", "Bearer token");
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.total, 1);
  assert.equal(res.body.data[0].id, "auction-2");
});

test("GET /auctions/:id returns detail for AdminL1", async () => {
  const handler = createApiHandler(createBaseDeps());
  const req = createMockRequest("GET", "/auctions/auction-1", "Bearer token");
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.id, "auction-1");
});

test("GET /auctions/:id returns 403 when non-L1 actor lacks access", async () => {
  const handler = createApiHandler(createBaseDeps({
    getUserById: async () => ({
      id: "actor-2",
      role: "AdminL2",
      email: "admin2@example.com",
      phone: "555-0002",
      displayName: "Admin 2",
      createdAt: "2026-02-13T04:00:00.000Z",
      updatedAt: "2026-02-13T04:00:00.000Z",
    }),
    listAuctionsForActor: async () => ([{id: "auction-2", name: "A2"}]),
  }));
  const req = createMockRequest("GET", "/auctions/auction-1", "Bearer token");
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error.code, "role_forbidden");
});

test("GET /auctions/:id returns 404 when missing", async () => {
  const handler = createApiHandler(createBaseDeps({
    getAuctionById: async () => null,
  }));
  const req = createMockRequest("GET", "/auctions/missing", "Bearer token");
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.error.code, "auction_not_found");
});
