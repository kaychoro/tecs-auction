const test = require("node:test");
const assert = require("node:assert/strict");

const {AuditLogsRepository} = require("../lib/repositories/auditLogs.js");

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

test("createAuditLog writes an audit record with defaults", async () => {
  const repo = new AuditLogsRepository(new InMemoryCollectionRef(), {
    idGenerator: () => "audit-1",
    now: () => "2026-02-13T02:00:00.000Z",
  });

  const log = await repo.createAuditLog({
    auctionId: "auction-1",
    actorUserId: "user-1",
    action: "item_updated",
    targetType: "item",
    targetId: "item-1",
  });

  assert.equal(log.id, "audit-1");
  assert.equal(log.createdAt, "2026-02-13T02:00:00.000Z");
  assert.deepEqual(log.metadata, {});
});

test("getAuditLogById returns null when log is missing", async () => {
  const repo = new AuditLogsRepository(new InMemoryCollectionRef());
  const log = await repo.getAuditLogById("missing-log");
  assert.equal(log, null);
});

test("createAuditLog stores metadata and can be read back", async () => {
  const repo = new AuditLogsRepository(new InMemoryCollectionRef(), {
    idGenerator: () => "audit-2",
    now: () => "2026-02-13T02:30:00.000Z",
  });

  await repo.createAuditLog({
    auctionId: "auction-2",
    actorUserId: "user-2",
    action: "payment_status_changed",
    targetType: "bidder",
    targetId: "user-3",
    metadata: {paid: true},
  });

  const loaded = await repo.getAuditLogById("audit-2");
  assert.equal(loaded.action, "payment_status_changed");
  assert.deepEqual(loaded.metadata, {paid: true});
});
