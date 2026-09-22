import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addDays, canCheckout, canConnectRepo, daysLeft, resolveAccess } from "./entitlements.js";

describe("resolveAccess", () => {
  const now = new Date("2026-09-07T00:00:00.000Z");

  it("grants paid during an active 30-day trial", () => {
    const access = resolveAccess(
      { tier: "free", tierExpiresAt: null, trialEndsAt: addDays(now, 30) },
      now,
    );
    assert.deepEqual(access, { tier: "paid", source: "trial" });
  });

  it("falls back to free after the trial ends", () => {
    const access = resolveAccess(
      { tier: "free", tierExpiresAt: null, trialEndsAt: addDays(now, -1) },
      now,
    );
    assert.deepEqual(access, { tier: "free", source: "free" });
  });

  it("prefers an active Stars subscription over trial", () => {
    const access = resolveAccess(
      {
        tier: "premium",
        tierExpiresAt: addDays(now, 20),
        trialEndsAt: addDays(now, 10),
      },
      now,
    );
    assert.deepEqual(access, { tier: "premium", source: "subscription" });
  });

  it("treats an expired paid tier as free if trial is also over", () => {
    const access = resolveAccess(
      {
        tier: "paid",
        tierExpiresAt: addDays(now, -1),
        trialEndsAt: addDays(now, -2),
      },
      now,
    );
    assert.deepEqual(access, { tier: "free", source: "free" });
  });
});

describe("canCheckout", () => {
  it("blocks buying the plan the user already pays for", () => {
    assert.equal(
      canCheckout({ tier: "paid", source: "subscription" }, "paid"),
      "You're already on Paid.",
    );
  });

  it("allows upgrading from paid to premium", () => {
    assert.equal(canCheckout({ tier: "paid", source: "subscription" }, "premium"), null);
  });

  it("allows checkout during trial", () => {
    assert.equal(canCheckout({ tier: "paid", source: "trial" }, "paid"), null);
  });
});

describe("canConnectRepo", () => {
  it("blocks when the user is at the tier repo cap", () => {
    assert.equal(canConnectRepo(1, 1), "You're at your repo limit (1). /disconnect one or /upgrade.");
    assert.equal(canConnectRepo(1, 5), null);
    assert.equal(canConnectRepo(20, null), null);
  });
});

describe("daysLeft", () => {
  it("rounds remaining trial time up to whole days", () => {
    const now = new Date("2026-09-07T00:00:00.000Z");
    assert.equal(daysLeft(addDays(now, 30), now), 30);
    assert.equal(daysLeft(addDays(now, -1), now), 0);
    assert.equal(daysLeft(null, now), null);
  });
});
