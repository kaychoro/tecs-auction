const test = require("node:test");
const assert = require("node:assert/strict");

const {createApiHandler} = require("../lib/api.js");
const {BidViewsRepository} = require("../lib/repositories/bidViews.js");

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

function createStatefulBidDeps() {
  const bids = [];
  let counter = 0;
  const bidViews = new BidViewsRepository({
    listBids: async (itemId) => bids.filter((bid) => bid.itemId === itemId),
  });

  return {
    bids,
    deps: {
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
      listItemsByAuction: async () => [],
      updateItem: async () => null,
      deleteItem: async () => true,
      createImage: async () => {
        throw new Error("not used");
      },
      createBid: async (input) => {
        counter += 1;
        const bid = {
          id: `bid-${counter}`,
          ...input,
          placedAt: counter === 1 ?
            "2026-02-20T18:00:00.000Z" :
            "2026-02-20T18:00:01.000Z",
        };
        bids.push(bid);
        return bid;
      },
      getCurrentHighBid: async (itemId) => bidViews.getCurrentHighBid(itemId),
      createAuditLog: async () => ({
        id: "audit-1",
        auctionId: "auction-1",
        actorUserId: "bidder-1",
        action: "bid_placed",
        targetType: "item",
        targetId: "item-1",
        metadata: {},
        createdAt: "2026-02-20T18:00:01.000Z",
      }),
      getTotals: async () => null,
      upsertTotals: async (input) => ({
        ...input,
        updatedAt: "2026-02-20T18:00:01.000Z",
      }),
      listAuctionsForActor: async () => [],
      listJoinedAuctionsForUser: async () => [],
      getAuctionById: async () => ({
        id: "auction-1",
        name: "Auction 1",
        status: "Open",
        timeZone: "America/Denver",
        auctionCode: "CODE1",
        notificationSettings: {inAppEnabled: true},
        paymentUrl: null,
        createdBy: "admin-1",
        createdAt: "2026-02-13T04:00:00.000Z",
        updatedAt: "2026-02-13T04:00:00.000Z",
      }),
    },
  };
}

test("POST /items/:id/bids accepts first bid", async () => {
  const setup = createStatefulBidDeps();
  const handler = createApiHandler(setup.deps);

  const req = createMockRequest(
    "POST",
    "/items/item-1/bids",
    "Bearer token",
    {amount: 100}
  );
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.bid.amount, 100);
  assert.equal(res.body.currentHighBid.id, "bid-1");
});

test("POST /items/:id/bids accepts higher bid", async () => {
  const setup = createStatefulBidDeps();
  const handler = createApiHandler(setup.deps);

  await handler(
    createMockRequest("POST", "/items/item-1/bids", "Bearer token", {amount: 80}),
    createMockResponse()
  );

  const secondRes = createMockResponse();
  await handler(
    createMockRequest("POST", "/items/item-1/bids", "Bearer token", {amount: 120}),
    secondRes
  );

  assert.equal(secondRes.statusCode, 200);
  assert.equal(secondRes.body.currentHighBid.amount, 120);
  assert.equal(secondRes.body.currentHighBid.id, "bid-2");
});

test("POST /items/:id/bids rejects equal bid and keeps existing high bid", async () => {
  const setup = createStatefulBidDeps();
  const handler = createApiHandler(setup.deps);

  await handler(
    createMockRequest("POST", "/items/item-1/bids", "Bearer token", {amount: 100}),
    createMockResponse()
  );

  const secondRes = createMockResponse();
  await handler(
    createMockRequest("POST", "/items/item-1/bids", "Bearer token", {amount: 100}),
    secondRes
  );

  assert.equal(secondRes.statusCode, 409);
  assert.equal(secondRes.body.error.code, "bid_too_low");
});
