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

  it("skips env placeholders, comments, and public addresses", () => {
    const text = `
# token="example-secret-value"
openai_api_key = "env(OPENAI_API_KEY)"
const token = "0x1111111111111111111111111111111111111111"
secret = "GPU_SHARED_SECRET"
`;
    assert.equal(scanTextForSecrets(text, "scripts/start.sh").length, 0);
  });

  it("still flags a long quoted secret assignment", () => {
    const findings = scanTextForSecrets(`const api_key = "sk_test_live_abcdefghijklmnopqrstuv";`, "src/cfg.ts");
    assert.ok(findings.some((finding) => finding.tool === "secrets"));
  });
});
