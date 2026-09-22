import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { digestChanged, diffFindings, isDigestDue, type StoredDigest } from "./logic.js";

const clean: StoredDigest = {
  findings: [],
  ci: { ok: true, message: "CI passed on main." },
  notes: [],
};

const cve: StoredDigest = {
  findings: [
    { severity: "P1", tool: "deps", message: "lodash@4.17.20  GHSA-1", file: "package.json" },
  ],
  ci: { ok: true, message: "CI passed on main." },
  notes: [],
};

describe("isDigestDue", () => {
  const now = new Date("2026-09-22T12:00:00.000Z");

  it("is due when a repo has never been checked", () => {
    assert.equal(isDigestDue(null, "daily", now), true);
  });

  it("waits a day for paid and a week for free", () => {
    assert.equal(isDigestDue(new Date("2026-09-21T12:00:00.000Z"), "daily", now), true);
    assert.equal(isDigestDue(new Date("2026-09-21T13:00:00.000Z"), "daily", now), false);
    assert.equal(isDigestDue(new Date("2026-09-16T12:00:00.000Z"), "weekly", now), false);
    assert.equal(isDigestDue(new Date("2026-09-15T12:00:00.000Z"), "weekly", now), true);
  });
});

describe("digestChanged", () => {
  it("notifies on the first run even if clean", () => {
    assert.equal(digestChanged(null, clean), true);
  });

  it("skips the same snapshot", () => {
    assert.equal(digestChanged(cve, cve), false);
  });

  it("notifies when a CVE appears or CI flips", () => {
    assert.equal(digestChanged(clean, cve), true);
    assert.equal(
      digestChanged(clean, { ...clean, ci: { ok: false, message: "CI failure on main." } }),
      true,
    );
  });
});

describe("diffFindings", () => {
  it("splits new and resolved actionable findings", () => {
    const diff = diffFindings(cve.findings, [
      { severity: "P1", tool: "deps", message: "left-pad@1.0.0  GHSA-2", file: "package.json" },
    ]);
    assert.equal(diff.new_findings.length, 1);
    assert.equal(diff.resolved_findings.length, 1);
    assert.match(diff.new_findings[0].message, /left-pad/);
  });
});
