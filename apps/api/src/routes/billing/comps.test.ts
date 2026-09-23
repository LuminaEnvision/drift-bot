import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isCompPremium } from "./comps.js";

describe("isCompPremium", () => {
  it("grants the built-in complimentary username", () => {
    assert.equal(isCompPremium("martaralj"), true);
    assert.equal(isCompPremium("@MartaRalj"), true);
  });

  it("does not grant a random handle", () => {
    assert.equal(isCompPremium("someoneelse"), false);
    assert.equal(isCompPremium(null), false);
  });
});
