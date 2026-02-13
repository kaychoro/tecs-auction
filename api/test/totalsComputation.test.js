const test = require("node:test");
const assert = require("node:assert/strict");

const {computeBidderTotalsFromBids} = require("../lib/totalsComputation.js");

test("computeBidderTotalsFromBids updates totals based on current high bids", () => {
  const totals = computeBidderTotalsFromBids([
    {
      id: "b1",
      auctionId: "a1",
      itemId: "i1",
      bidderId: "u1",
      amount: 100,
      placedAt: "2026-02-20T18:00:00.000Z",
    },
    {
      id: "b2",
      auctionId: "a1",
      itemId: "i1",
      bidderId: "u2",
      amount: 120,
      placedAt: "2026-02-20T18:01:00.000Z",
    },
    {
      id: "b3",
      auctionId: "a1",
      itemId: "i2",
      bidderId: "u1",
      amount: 50,
      placedAt: "2026-02-20T18:02:00.000Z",
    },
  ]);

  assert.deepEqual(totals, [
    {bidderId: "u1", subtotal: 50, total: 50},
    {bidderId: "u2", subtotal: 120, total: 120},
  ]);
});
