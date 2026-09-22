import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatAgentPrompt } from "./prompt.js";
import { promptToPdf } from "./pdf.js";

describe("formatAgentPrompt", () => {
  it("asks the agent to fix P0s and names the repo", () => {
    const prompt = formatAgentPrompt({
      repo: "acme/vault",
      kind: "full",
      results: [{ tool: "secrets", ok: true, findings: [] }],
      findings: [
        {
          severity: "P0",
          tool: "secrets",
          message: "Looks like a GitHub token",
          file: "src/auth.ts",
          line: 12,
        },
      ],
    });
    assert.match(prompt, /acme\/vault/);
    assert.match(prompt, /Fix every P0/);
    assert.match(prompt, /src\/auth.ts:12/);
    assert.match(prompt, /github.com\/acme\/vault\/blob\/HEAD\/src\/auth.ts#L12/);
    assert.match(prompt, /Why:/);
    assert.match(prompt, /Copy everything above/);
  });
});

describe("promptToPdf", () => {
  it("builds a PDF buffer", async () => {
    const pdf = await promptToPdf("Fix every P0 in acme/vault.");
    assert.equal(pdf.subarray(0, 4).toString(), "%PDF");
  });
});
