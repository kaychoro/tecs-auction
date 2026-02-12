const test = require("node:test");
const assert = require("node:assert/strict");

const {UsersRepository} = require("../lib/repositories/users.js");

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

test("getUserById returns null when user is missing", async () => {
  const repo = new UsersRepository(new InMemoryCollectionRef());
  const user = await repo.getUserById("missing-user");
  assert.equal(user, null);
});

test("upsertUser and getUserById roundtrip user record", async () => {
  const repo = new UsersRepository(new InMemoryCollectionRef());
  const created = {
    id: "user-1",
    role: "Bidder",
    email: "u1@example.com",
    phone: "555-0001",
    displayName: "User One",
    emailVerifiedAt: null,
    lastAuctionId: null,
    createdAt: "2026-02-12T17:00:00.000Z",
    updatedAt: "2026-02-12T17:00:00.000Z",
  };

  await repo.upsertUser(created);
  const loaded = await repo.getUserById("user-1");

  assert.deepEqual(loaded, created);
});

test("updateUser updates existing user and returns null when missing", async () => {
  const repo = new UsersRepository(new InMemoryCollectionRef(), {
    now: () => "2026-02-12T18:00:00.000Z",
  });

  await repo.upsertUser({
    id: "user-2",
    role: "Bidder",
    email: "u2@example.com",
    phone: "555-0002",
    displayName: "User Two",
    emailVerifiedAt: null,
    lastAuctionId: null,
    createdAt: "2026-02-12T17:00:00.000Z",
    updatedAt: "2026-02-12T17:00:00.000Z",
  });

  const updated = await repo.updateUser("user-2", {
    displayName: "User Two Updated",
    lastAuctionId: "auction-1",
  });

  assert.equal(updated.displayName, "User Two Updated");
  assert.equal(updated.lastAuctionId, "auction-1");
  assert.equal(updated.updatedAt, "2026-02-12T18:00:00.000Z");

  const missing = await repo.updateUser("user-missing", {
    displayName: "No User",
  });
  assert.equal(missing, null);
});
