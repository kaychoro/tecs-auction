const test = require("node:test");
const assert = require("node:assert/strict");

const {
  NotificationsRepository,
} = require("../lib/repositories/notifications.js");

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

test("createNotification writes notification record", async () => {
  const repo = new NotificationsRepository(new InMemoryCollectionRef(), {
    idGenerator: () => "notification-1",
    now: () => "2026-02-13T00:00:00.000Z",
  });

  const notification = await repo.createNotification({
    auctionId: "auction-1",
    userId: "user-1",
    type: "outbid_in_app",
    message: "You were outbid",
    refType: "item",
    refId: "item-1",
  });

  assert.equal(notification.id, "notification-1");
  assert.equal(notification.readAt, null);
  assert.equal(notification.createdAt, "2026-02-13T00:00:00.000Z");
});

test("getNotificationById returns null when missing", async () => {
  const repo = new NotificationsRepository(new InMemoryCollectionRef());
  const notification = await repo.getNotificationById("missing");
  assert.equal(notification, null);
});

test("updateNotification updates existing notification and returns null when missing", async () => {
  const repo = new NotificationsRepository(new InMemoryCollectionRef(), {
    idGenerator: () => "notification-2",
    now: () => "2026-02-13T00:05:00.000Z",
  });

  await repo.createNotification({
    auctionId: "auction-2",
    userId: "user-2",
    type: "outbid_in_app",
    message: "Outbid on item",
    refType: "item",
    refId: "item-2",
  });

  const updated = await repo.updateNotification("notification-2", {
    readAt: "2026-02-13T00:06:00.000Z",
  });

  assert.equal(updated.readAt, "2026-02-13T00:06:00.000Z");

  const missing = await repo.updateNotification("missing", {
    readAt: "2026-02-13T00:07:00.000Z",
  });
  assert.equal(missing, null);
});
