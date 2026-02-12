const test = require("node:test");
const assert = require("node:assert/strict");

const {BidsRepository} = require("../lib/repositories/bids.js");

class InMemoryDocRef {
  constructor(store, id) {
    this.store = store;
    this.id = id;
  }

  async set(value) {
    this.store.set(this.id, value);
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

function createTransactionRunner() {
  return async (handler) => {
    const operations = [];
    const tx = {
      set(docRef, value) {
        operations.push({docRef, value});
      },
    };

    const result = await handler(tx);
    await Promise.all(operations.map((op) => op.docRef.set(op.value)));
    return result;
  };
}

test("createBid writes bid record inside transaction", async () => {
  const collection = new InMemoryCollectionRef();
  const repo = new BidsRepository(
    collection,
    createTransactionRunner(),
    {
      idGenerator: () => "bid-1",
      now: () => "2026-02-12T23:00:00.000Z",
    }
  );

  const created = await repo.createBid({
    auctionId: "auction-1",
    itemId: "item-1",
    bidderId: "user-1",
    amount: 75,
  });

  assert.deepEqual(created, {
    id: "bid-1",
    auctionId: "auction-1",
    itemId: "item-1",
    bidderId: "user-1",
    amount: 75,
    placedAt: "2026-02-12T23:00:00.000Z",
  });

  assert.deepEqual(collection.store.get("bid-1"), created);
});
