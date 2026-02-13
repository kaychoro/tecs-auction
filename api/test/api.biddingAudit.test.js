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

test("POST /items/:id/bids writes audit log entry on success", async () => {
  let auditInput = null;
  let highBidReads = 0;
  const handler = createApiHandler({
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
    createBid: async () => ({
      id: "bid-1",
      auctionId: "auction-1",
      itemId: "item-1",
      bidderId: "bidder-1",
      amount: 110,
      placedAt: "2026-02-20T18:00:01.000Z",
    }),
    getCurrentHighBid: async () => {
      highBidReads += 1;
      if (highBidReads === 1) {
        return null;
      }
      return {
        id: "bid-1",
        auctionId: "auction-1",
        itemId: "item-1",
        bidderId: "bidder-1",
        amount: 110,
        placedAt: "2026-02-20T18:00:01.000Z",
      };
    },
    createAuditLog: async (input) => {
      auditInput = input;
      return {
        id: "audit-1",
        ...input,
        createdAt: "2026-02-20T18:00:01.000Z",
      };
    },
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
  });

  const req = createMockRequest(
    "POST",
    "/items/item-1/bids",
    "Bearer token",
    {amount: 110}
  );
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(auditInput.action, "bid_placed");
  assert.equal(auditInput.targetId, "item-1");
  assert.equal(auditInput.metadata.bidId, "bid-1");
  assert.equal(auditInput.metadata.amount, 110);
});
