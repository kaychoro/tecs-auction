const test = require("node:test");
const assert = require("node:assert/strict");

const {MembershipsRepository} = require("../lib/repositories/memberships.js");

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

test("createMembership writes membership with default active status", async () => {
  const collection = new InMemoryCollectionRef();
  const repo = new MembershipsRepository(collection, {
    now: () => "2026-02-12T15:00:00.000Z",
  });

  const created = await repo.createMembership({
    auctionId: "auction-1",
    userId: "user-1",
  });

  assert.equal(created.status, "active");
  assert.equal(created.createdAt, "2026-02-12T15:00:00.000Z");
  assert.equal(created.updatedAt, "2026-02-12T15:00:00.000Z");
  assert.equal(created.roleOverride, null);
  assert.equal(created.bidderNumber, null);
});

test("getMembership returns null when not found", async () => {
  const collection = new InMemoryCollectionRef();
  const repo = new MembershipsRepository(collection);

  const result = await repo.getMembership("missing-auction", "missing-user");
  assert.equal(result, null);
});

test("updateMembership updates existing membership and returns null when missing", async () => {
  const collection = new InMemoryCollectionRef();
  const repo = new MembershipsRepository(collection, {
    now: () => "2026-02-12T16:00:00.000Z",
  });

  await repo.createMembership({
    auctionId: "auction-2",
    userId: "user-2",
    status: "active",
    bidderNumber: 14,
  });

  const updated = await repo.updateMembership("auction-2", "user-2", {
    status: "revoked",
    roleOverride: "AdminL3",
  });

  assert.equal(updated.status, "revoked");
  assert.equal(updated.roleOverride, "AdminL3");
  assert.equal(updated.updatedAt, "2026-02-12T16:00:00.000Z");

  const missing = await repo.updateMembership("auction-x", "user-x", {
    status: "revoked",
  });
  assert.equal(missing, null);
});
