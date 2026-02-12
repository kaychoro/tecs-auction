const test = require("node:test");
const assert = require("node:assert/strict");

const {
  BidderNumberCountersRepository,
} = require("../lib/repositories/bidderNumberCounters.js");

class InMemoryCounterCollection {
  constructor(store) {
    this.store = store;
  }

  doc(id) {
    return {id};
  }
}

class SerializedTransactionRunner {
  constructor(store) {
    this.store = store;
    this.chain = Promise.resolve();
  }

  async runTransaction(updateFn) {
    const run = async () => {
      const pendingWrites = [];
      const tx = {
        get: async (ref) => {
          const value = this.store.get(ref.id);
          return {
            exists: typeof value !== "undefined",
            data: () => value,
          };
        },
        set: (ref, value) => {
          pendingWrites.push({id: ref.id, value});
        },
      };

      const result = await updateFn(tx);
      for (const write of pendingWrites) {
        this.store.set(write.id, write.value);
      }
      return result;
    };

    const current = this.chain.then(run);
    this.chain = current.then(() => undefined, () => undefined);
    return current;
  }
}

test("allocateNextBidderNumber starts at 1 for a new auction", async () => {
  const store = new Map();
  const db = new SerializedTransactionRunner(store);
  const repo = new BidderNumberCountersRepository(
    db,
    new InMemoryCounterCollection(store),
    {now: () => "2026-02-20T18:00:00.000Z"}
  );

  const allocated = await repo.allocateNextBidderNumber("auction-1");

  assert.equal(allocated, 1);
  assert.deepEqual(store.get("auction-1"), {
    auctionId: "auction-1",
    nextBidderNumber: 2,
    updatedAt: "2026-02-20T18:00:00.000Z",
  });
});

test("allocateNextBidderNumber remains unique under concurrent requests", async () => {
  const store = new Map();
  const db = new SerializedTransactionRunner(store);
  const repo = new BidderNumberCountersRepository(
    db,
    new InMemoryCounterCollection(store),
    {now: () => "2026-02-20T18:00:00.000Z"}
  );

  const allocated = await Promise.all([
    repo.allocateNextBidderNumber("auction-1"),
    repo.allocateNextBidderNumber("auction-1"),
    repo.allocateNextBidderNumber("auction-1"),
    repo.allocateNextBidderNumber("auction-1"),
    repo.allocateNextBidderNumber("auction-1"),
  ]);

  const sorted = [...allocated].sort((a, b) => a - b);
  assert.deepEqual(sorted, [1, 2, 3, 4, 5]);
  assert.equal(new Set(allocated).size, 5);
  assert.equal(store.get("auction-1").nextBidderNumber, 6);
});
