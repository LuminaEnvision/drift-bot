import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clusterDepFindings } from "./deps/index.js";

describe("clusterDepFindings", () => {
  it("collapses many advisories into one bump", () => {
    const finding = clusterDepFindings(
      { name: "next", version: "14.2.15", ecosystem: "npm", file: "frontend/package.json" },
      [
        { id: "GHSA-1", summary: "a" },
        { id: "GHSA-2", summary: "b" },
        { id: "GHSA-3", summary: "c" },
        { id: "GHSA-4", summary: "d" },
      ],
    );
    assert.ok(finding);
    assert.match(finding.message, /one version bump, not 4 patches/);
    assert.match(finding.message, /GHSA-1, GHSA-2, GHSA-3 \+1 more/);
    assert.equal(finding.file, "frontend/package.json");
  });
});
