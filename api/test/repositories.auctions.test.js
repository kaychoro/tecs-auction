const test = require("node:test");
const assert = require("node:assert/strict");

const {AuctionsRepository} = require("../lib/repositories/auctions.js");

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

test("createAuction writes record with generated id and timestamps", async () => {
  const collection = new InMemoryCollectionRef();
  const repo = new AuctionsRepository(collection, {
    idGenerator: () => "auction-1",
    now: () => "2026-02-12T12:00:00.000Z",
  });

  const created = await repo.createAuction({
    name: "Spring Gala",
    status: "Setup",
    timeZone: "America/Denver",
    auctionCode: "GALA26",
    createdBy: "user-1",
  });

  assert.equal(created.id, "auction-1");
  assert.equal(created.createdAt, "2026-02-12T12:00:00.000Z");
  assert.equal(created.updatedAt, "2026-02-12T12:00:00.000Z");
  assert.deepEqual(created.notificationSettings, {inAppEnabled: true});
});

test("getAuctionById returns null when not found", async () => {
  const collection = new InMemoryCollectionRef();
  const repo = new AuctionsRepository(collection);

  const result = await repo.getAuctionById("missing-id");
  assert.equal(result, null);
});

test("updateAuction updates existing record and returns null when missing", async () => {
  const collection = new InMemoryCollectionRef();
  const repo = new AuctionsRepository(collection, {
    idGenerator: () => "auction-2",
    now: () => "2026-02-12T13:00:00.000Z",
  });

  await repo.createAuction({
    name: "Initial",
    status: "Setup",
    timeZone: "America/Denver",
    auctionCode: "CODE1",
    createdBy: "user-2",
  });

  const updated = await repo.updateAuction("auction-2", {
    name: "Updated",
    status: "Ready",
  });

  assert.equal(updated.name, "Updated");
  assert.equal(updated.status, "Ready");
  assert.equal(updated.updatedAt, "2026-02-12T13:00:00.000Z");

  const missing = await repo.updateAuction("does-not-exist", {name: "Nope"});
  assert.equal(missing, null);
});
