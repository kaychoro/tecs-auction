const test = require("node:test");
const assert = require("node:assert/strict");

const {resolveEffectiveRole} = require("../lib/roles.js");

test("returns global role when no override is provided", () => {
  const role = resolveEffectiveRole("AdminL2");
  assert.equal(role, "AdminL2");
});

test("applies down-scope override when privilege decreases", () => {
  const role = resolveEffectiveRole("AdminL2", "AdminL3");
  assert.equal(role, "AdminL3");
});

test("ignores up-scope override attempts", () => {
  const role = resolveEffectiveRole("AdminL3", "AdminL2");
  assert.equal(role, "AdminL3");
});

test("keeps AdminL1 global role even if override is lower", () => {
  const role = resolveEffectiveRole("AdminL1", "AdminL3");
  assert.equal(role, "AdminL1");
});
