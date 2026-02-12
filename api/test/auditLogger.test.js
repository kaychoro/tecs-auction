const test = require("node:test");
const assert = require("node:assert/strict");

const {AuditLogger} = require("../lib/auditLogger.js");

test("logAction writes audit entry with action and metadata", async () => {
  let capturedInput = null;
  const logger = new AuditLogger({
    async createAuditLog(input) {
      capturedInput = input;
      return {
        id: "audit-1",
        ...input,
        createdAt: "2026-02-13T03:00:00.000Z",
      };
    },
  });

  const result = await logger.logAction({
    auctionId: "auction-1",
    actorUserId: "user-1",
    action: "item_updated",
    targetType: "item",
    targetId: "item-1",
    metadata: {field: "name"},
  });

  assert.equal(capturedInput.action, "item_updated");
  assert.deepEqual(capturedInput.metadata, {field: "name"});
  assert.equal(result.id, "audit-1");
});

test("logAction defaults metadata to empty object", async () => {
  const logger = new AuditLogger({
    async createAuditLog(input) {
      return {
        id: "audit-2",
        ...input,
        createdAt: "2026-02-13T03:10:00.000Z",
      };
    },
  });

  const result = await logger.logAction({
    auctionId: "auction-2",
    actorUserId: "user-2",
    action: "auction_updated",
    targetType: "auction",
    targetId: "auction-2",
  });

  assert.deepEqual(result.metadata, {});
});

test("logAction throws when required fields are missing", async () => {
  const logger = new AuditLogger({
    async createAuditLog(input) {
      return {
        id: "audit-x",
        ...input,
        createdAt: "2026-02-13T03:15:00.000Z",
      };
    },
  });

  await assert.rejects(
    () => logger.logAction({
      auctionId: "",
      actorUserId: "user-3",
      action: "item_deleted",
      targetType: "item",
      targetId: "item-3",
    }),
    /Missing required audit field: auctionId/
  );
});
