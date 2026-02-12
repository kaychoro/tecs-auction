const test = require("node:test");
const assert = require("node:assert/strict");

const {
  requireAuctionMembership,
  isMembershipError,
} = require("../lib/membership.js");

test("allows AdminL1 without membership", () => {
  const result = requireAuctionMembership("AdminL1");
  assert.equal(result, undefined);
});

test("returns membership for active non-L1 member", () => {
  const membership = {
    auctionId: "a1",
    userId: "u1",
    status: "active",
    roleOverride: null,
  };

  const result = requireAuctionMembership("AdminL2", membership);
  assert.deepEqual(result, membership);
});

test("throws role_forbidden when membership is missing", () => {
  assert.throws(
    () => requireAuctionMembership("Bidder", undefined),
    (error) => {
      assert.equal(isMembershipError(error), true);
      assert.equal(error.status, 403);
      return true;
    }
  );
});

test("throws role_forbidden when membership is revoked", () => {
  assert.throws(
    () => requireAuctionMembership("AdminL3", {
      auctionId: "a1",
      userId: "u1",
      status: "revoked",
      roleOverride: null,
    }),
    (error) => {
      assert.equal(isMembershipError(error), true);
      assert.equal(error.status, 403);
      return true;
    }
  );
});
