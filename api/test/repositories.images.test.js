const test = require("node:test");
const assert = require("node:assert/strict");

const {ImagesRepository} = require("../lib/repositories/images.js");

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

test("createImage writes image record with generated id", async () => {
  const repo = new ImagesRepository(new InMemoryCollectionRef(), {
    idGenerator: () => "image-1",
    now: () => "2026-02-12T21:00:00.000Z",
  });

  const image = await repo.createImage({
    auctionId: "auction-1",
    itemId: "item-1",
    storagePath: "auctions/auction-1/items/item-1/original.jpg",
    originalWidth: 2048,
    originalHeight: 1536,
    variants: [
      {width: 320, url: "https://img/320.jpg"},
      {width: 640, url: "https://img/640.jpg"},
    ],
  });

  assert.equal(image.id, "image-1");
  assert.equal(image.createdAt, "2026-02-12T21:00:00.000Z");
  assert.equal(image.updatedAt, "2026-02-12T21:00:00.000Z");
  assert.equal(image.variants.length, 2);
});

test("getImageById returns null for missing image", async () => {
  const repo = new ImagesRepository(new InMemoryCollectionRef());
  const image = await repo.getImageById("missing-image");
  assert.equal(image, null);
});

test("updateImage updates existing image and returns null when missing", async () => {
  const repo = new ImagesRepository(new InMemoryCollectionRef(), {
    idGenerator: () => "image-2",
    now: () => "2026-02-12T22:00:00.000Z",
  });

  await repo.createImage({
    auctionId: "auction-2",
    itemId: "item-2",
    storagePath: "auctions/auction-2/items/item-2/original.jpg",
    originalWidth: 1200,
    originalHeight: 900,
    variants: [{width: 320, url: "https://img/old-320.jpg"}],
  });

  const updated = await repo.updateImage("image-2", {
    variants: [{width: 320, url: "https://img/new-320.jpg"}],
  });

  assert.equal(updated.variants[0].url, "https://img/new-320.jpg");
  assert.equal(updated.updatedAt, "2026-02-12T22:00:00.000Z");

  const missing = await repo.updateImage("missing-image", {
    storagePath: "new/path.jpg",
  });
  assert.equal(missing, null);
});
