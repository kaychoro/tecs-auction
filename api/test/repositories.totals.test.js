const test = require("node:test");
const assert = require("node:assert/strict");

const {TotalsRepository} = require("../lib/repositories/totals.js");

class InMemoryDocRef {
  constructor(store, id) {
    this.store = store;
    this.id = id;
  }

  async set(value) {
    this.store.set(this.id, value);
  }

  async get() {
    const value = this.store.get(this.id);
    return {
      exists: Boolean(value),
      data: () => value,
    };
  }
}

class InMemoryCollectionRef {
  constructor() {
    this.store = new Map();
  }

  doc(id) {
    return new InMemoryDocRef(this.store, id);
  }
}

test("upsertTotals writes totals record", async () => {
  const repo = new TotalsRepository(new InMemoryCollectionRef(), {
    now: () => "2026-02-13T01:00:00.000Z",
  });

  const totals = await repo.upsertTotals({
    auctionId: "auction-1",
    bidderId: "user-1",
    bidderNumber: 101,
    displayName: "Bidder One",
    subtotal: 150,
    total: 150,
    paid: false,
  });

  assert.equal(totals.auctionId, "auction-1");
  assert.equal(totals.bidderId, "user-1");
  assert.equal(totals.updatedAt, "2026-02-13T01:00:00.000Z");
});

test("getTotals returns null when missing", async () => {
  const repo = new TotalsRepository(new InMemoryCollectionRef());
  const totals = await repo.getTotals("missing-auction", "missing-user");
  assert.equal(totals, null);
});

test("updateTotals updates existing totals and returns null when missing", async () => {
  const repo = new TotalsRepository(new InMemoryCollectionRef(), {
    now: () => "2026-02-13T01:30:00.000Z",
  });

  await repo.upsertTotals({
    auctionId: "auction-2",
    bidderId: "user-2",
    bidderNumber: 202,
    displayName: "Bidder Two",
    subtotal: 200,
    total: 200,
    paid: false,
  });

  const updated = await repo.updateTotals("auction-2", "user-2", {
    paid: true,
    total: 215,
  });

  assert.equal(updated.paid, true);
  assert.equal(updated.total, 215);
  assert.equal(updated.updatedAt, "2026-02-13T01:30:00.000Z");

  const missing = await repo.updateTotals("auction-x", "user-x", {
    paid: true,
  });
  assert.equal(missing, null);
});
