import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scanTextForCodeIssues } from "./code/index.js";

describe("scanTextForCodeIssues", () => {
  it("does not treat UI copy like Updated as SQL", () => {
    const findings = scanTextForCodeIssues("const msg = `Updated to ${status}.`;", "ui.tsx");
    assert.equal(
      findings.filter((finding) => finding.message.includes("SQL")).length,
      0,
    );
  });

  it("still flags concatenated SELECT", () => {
    const findings = scanTextForCodeIssues(
      `const q = "SELECT * FROM users WHERE id = '" + id;`,
      "db.js",
    );
    assert.ok(findings.some((finding) => finding.message.includes("SQL")));
  });

  it("downgrades JSON-LD dangerouslySetInnerHTML", () => {
    const findings = scanTextForCodeIssues(
      "dangerouslySetInnerHTML={{ __html: JSON.stringify(site) }}",
      "jsonld.tsx",
    );
    assert.equal(findings[0]?.severity, "info");
  });
});
