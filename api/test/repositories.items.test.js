const test = require("node:test");
const assert = require("node:assert/strict");

const {ItemsRepository} = require("../lib/repositories/items.js");

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

test("createItem writes item with generated id and defaults", async () => {
  const repo = new ItemsRepository(new InMemoryCollectionRef(), {
    idGenerator: () => "item-1",
    now: () => "2026-02-12T19:00:00.000Z",
  });

  const item = await repo.createItem({
    auctionId: "auction-1",
    name: "Gift Basket",
    type: "silent",
    startingPrice: 50,
  });

  assert.equal(item.id, "item-1");
  assert.equal(item.description, null);
  assert.equal(item.image, null);
  assert.equal(item.createdAt, "2026-02-12T19:00:00.000Z");
  assert.equal(item.updatedAt, "2026-02-12T19:00:00.000Z");
});

test("getItemById returns null when item is missing", async () => {
  const repo = new ItemsRepository(new InMemoryCollectionRef());
  const item = await repo.getItemById("missing-item");
  assert.equal(item, null);
});

test("updateItem updates existing item and returns null when missing", async () => {
  const repo = new ItemsRepository(new InMemoryCollectionRef(), {
    idGenerator: () => "item-2",
    now: () => "2026-02-12T20:00:00.000Z",
  });

  await repo.createItem({
    auctionId: "auction-2",
    name: "Original Name",
    type: "live",
    startingPrice: 100,
  });

  const updated = await repo.updateItem("item-2", {
    name: "Updated Name",
    startingPrice: 120,
  });

  assert.equal(updated.name, "Updated Name");
  assert.equal(updated.startingPrice, 120);
  assert.equal(updated.updatedAt, "2026-02-12T20:00:00.000Z");

  const missing = await repo.updateItem("missing-item", {name: "No Item"});
  assert.equal(missing, null);
});
