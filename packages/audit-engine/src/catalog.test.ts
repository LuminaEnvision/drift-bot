import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AUDIT_CHECKS, AUDIT_MVP_ROLLOUT, mvpAuditChecks } from "./catalog.js";

describe("audit offering", () => {
  it("ships secrets, deps, Semgrep, and Slither first", () => {
    assert.deepEqual([...AUDIT_MVP_ROLLOUT], [
      "/audit_secrets",
      "/audit_deps",
      "/audit_code",
      "/audit_contracts",
    ]);
  });

  it("marks those four as standalone MVP commands", () => {
    const commands = mvpAuditChecks().map((check) => check.command);
    for (const command of AUDIT_MVP_ROLLOUT) {
      assert.ok(commands.includes(command), `missing MVP command ${command}`);
    }
  });

  it("keeps CI status on the daily digest, not a separate audit command", () => {
    const ci = AUDIT_CHECKS.find((check) => check.id === "ci_status");
    assert.equal(ci?.mvp, true);
    assert.equal(ci?.foldedInto, "daily digest");
  });
});
