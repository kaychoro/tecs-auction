const test = require("node:test");
const assert = require("node:assert/strict");

const {
  resolveTargetStatus,
  runPhaseAutoAdvanceJob,
} = require("../lib/phaseAutoAdvance.js");

function createInMemoryPhaseDeps(seedAuctions) {
  const auctions = new Map(
    seedAuctions.map((auction) => [auction.id, {...auction}])
  );

  return {
    auctions,
    deps: {
      listAuctionsForPhaseAdvance: async () => {
        return Array.from(auctions.values()).map((auction) => ({...auction}));
      },
      advanceAuctionPhaseIfUnchanged: async ({
        auctionId,
        expectedUpdatedAt,
        toStatus,
        nowIso,
      }) => {
        const current = auctions.get(auctionId);
        if (!current) {
          return false;
        }
        if (current.updatedAt !== expectedUpdatedAt) {
          return false;
        }
        current.status = toStatus;
        current.updatedAt = nowIso;
        return true;
      },
    },
  };
}

test("resolveTargetStatus returns furthest due status", () => {
  const target = resolveTargetStatus(
    {
      readyAt: "2026-02-20T17:00:00.000Z",
      openAt: "2026-02-20T18:00:00.000Z",
      pendingAt: "2026-02-20T19:00:00.000Z",
    },
    new Date("2026-02-20T18:30:00.000Z")
  );

  assert.equal(target, "Open");
});

test("runPhaseAutoAdvanceJob advances eligible auctions once", async () => {
  const setup = createInMemoryPhaseDeps([
    {
      id: "auction-1",
      status: "Ready",
      updatedAt: "2026-02-20T17:00:00.000Z",
      phaseSchedule: {
        openAt: "2026-02-20T18:00:00.000Z",
      },
    },
  ]);
  const now = new Date("2026-02-20T18:30:00.000Z");

  const firstRun = await runPhaseAutoAdvanceJob(setup.deps, now);
  const secondRun = await runPhaseAutoAdvanceJob(setup.deps, now);

  assert.deepEqual(firstRun, {scanned: 1, advanced: 1});
  assert.deepEqual(secondRun, {scanned: 1, advanced: 0});
});

test("runPhaseAutoAdvanceJob is idempotent when data changed before write", async () => {
  const auction = {
    id: "auction-1",
    status: "Ready",
    updatedAt: "2026-02-20T17:00:00.000Z",
    phaseSchedule: {
      openAt: "2026-02-20T18:00:00.000Z",
    },
  };

  let firstRead = true;
  const deps = {
    listAuctionsForPhaseAdvance: async () => [{...auction}],
    advanceAuctionPhaseIfUnchanged: async ({expectedUpdatedAt}) => {
      if (firstRead) {
        firstRead = false;
        auction.updatedAt = "2026-02-20T17:05:00.000Z";
      }

      return auction.updatedAt === expectedUpdatedAt;
    },
  };

  const result = await runPhaseAutoAdvanceJob(
    deps,
    new Date("2026-02-20T18:30:00.000Z")
  );

  assert.deepEqual(result, {scanned: 1, advanced: 0});
});
