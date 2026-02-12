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
    authenticate: async () => ({uid: "user-1"}),
    getUserById: async () => ({
      id: "user-1",
      role: "Bidder",
      email: "user1@example.com",
      phone: "555-0001",
      displayName: "User One",
      createdAt: "2026-02-13T04:00:00.000Z",
      updatedAt: "2026-02-13T04:00:00.000Z",
    }),
    createAuction: async () => {
      throw new Error("not used");
    },
    updateAuction: async () => {
      throw new Error("not used");
    },
    listAuctionsForActor: async () => [],
    listJoinedAuctionsForUser: async () => [],
    getAuctionById: async () => null,
    ...overrides,
  };
}

test("GET /auctions/joined returns only joined auctions", async () => {
  const handler = createApiHandler(createBaseDeps({
    listJoinedAuctionsForUser: async (userId) => ([
      {id: "auction-1", name: `Joined for ${userId}`},
      {id: "auction-2", name: `Joined for ${userId}`},
    ]),
  }));
  const req = createMockRequest("GET", "/auctions/joined", "Bearer token");
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.total, 2);
  assert.equal(res.body.data[0].id, "auction-1");
  assert.equal(res.body.data[1].id, "auction-2");
});

test("GET /auctions/joined returns empty list when user has no memberships", async () => {
  const handler = createApiHandler(createBaseDeps());
  const req = createMockRequest("GET", "/auctions/joined", "Bearer token");
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.total, 0);
  assert.deepEqual(res.body.data, []);
});
