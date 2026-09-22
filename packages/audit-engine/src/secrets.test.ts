import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scanTextForSecrets } from "./secrets/index.js";

describe("scanTextForSecrets", () => {
  it("flags a GitHub PAT-shaped token", () => {
    const findings = scanTextForSecrets(`const auth = "ghp_${"a".repeat(36)}";`, "src/auth.ts");
    assert.equal(findings.length, 1);
    assert.equal(findings[0]?.severity, "P0");
    assert.equal(findings[0]?.file, "src/auth.ts");
  });

  it("ignores clean source", () => {
    assert.equal(scanTextForSecrets("export const ping = () => 'ok';", "src/ping.ts").length, 0);
  });
});
