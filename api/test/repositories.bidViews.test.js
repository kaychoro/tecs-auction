const test = require("node:test");
const assert = require("node:assert/strict");

const {BidViewsRepository} = require("../lib/repositories/bidViews.js");

test("getCurrentHighBid returns null when no bids exist", async () => {
  const repo = new BidViewsRepository({
    listBids: async () => [],
  });

  const highBid = await repo.getCurrentHighBid("item-1");
  assert.equal(highBid, null);
});

test("getCurrentHighBid prefers higher amount", async () => {
  const repo = new BidViewsRepository({
    listBids: async () => ([
      {
        id: "bid-1",
        auctionId: "auction-1",
        itemId: "item-1",
        bidderId: "user-1",
        amount: 50,
        placedAt: "2026-02-12T10:00:00.000Z",
      },
      {
        id: "bid-2",
        auctionId: "auction-1",
        itemId: "item-1",
        bidderId: "user-2",
        amount: 75,
        placedAt: "2026-02-12T10:01:00.000Z",
      },
    ]),
  });

  const highBid = await repo.getCurrentHighBid("item-1");
  assert.equal(highBid.id, "bid-2");
});

test("getCurrentHighBid uses earliest placedAt on tied amount", async () => {
  const repo = new BidViewsRepository({
    listBids: async () => ([
      {
        id: "bid-1",
        auctionId: "auction-1",
        itemId: "item-1",
        bidderId: "user-1",
        amount: 80,
        placedAt: "2026-02-12T10:02:00.000Z",
      },
      {
        id: "bid-2",
        auctionId: "auction-1",
        itemId: "item-1",
        bidderId: "user-2",
        amount: 80,
        placedAt: "2026-02-12T10:01:00.000Z",
      },
    ]),
  });

  const highBid = await repo.getCurrentHighBid("item-1");
  assert.equal(highBid.id, "bid-2");
});

test("getCurrentHighBid uses bidId as final tie-breaker", async () => {
  const repo = new BidViewsRepository({
    listBids: async () => ([
      {
        id: "bid-b",
        auctionId: "auction-1",
        itemId: "item-1",
        bidderId: "user-1",
        amount: 80,
        placedAt: "2026-02-12T10:01:00.000Z",
      },
      {
        id: "bid-a",
        auctionId: "auction-1",
        itemId: "item-1",
        bidderId: "user-2",
        amount: 80,
        placedAt: "2026-02-12T10:01:00.000Z",
      },
    ]),
  });

  const highBid = await repo.getCurrentHighBid("item-1");
  assert.equal(highBid.id, "bid-a");
});
