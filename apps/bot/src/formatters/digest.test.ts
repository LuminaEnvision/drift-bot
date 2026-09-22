import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatDigest } from "./digest.js";

describe("formatDigest", () => {
  it("names the repo and tells the agent-adjacent next step", () => {
    const text = formatDigest({
      repo: "acme/vault",
      cadence: "daily",
      forced: true,
      notified: true,
      last_checked_at: new Date().toISOString(),
      ci: { ok: true, message: "CI passed on main." },
      findings: [
        { severity: "P1", tool: "deps", message: "lodash@4.17.20  GHSA-1", file: "package.json" },
      ],
      new_findings: [
        { severity: "P1", tool: "deps", message: "lodash@4.17.20  GHSA-1", file: "package.json" },
      ],
      resolved_findings: [],
      notes: ["Found 1 advisory hit."],
    });
    assert.match(text, /acme\/vault/);
    assert.match(text, /CI passed/);
    assert.match(text, /lodash/);
    assert.match(text, /\/audit/);
  });
});
