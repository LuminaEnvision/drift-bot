import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { headerFindings, looksLikeEnvFile, looksLikeGitConfig, looksLikeHtmlShell } from "./index.js";

describe("surface classifiers", () => {
  it("does not treat a Next HTML shell as an env leak", () => {
    assert.equal(looksLikeHtmlShell("<!DOCTYPE html><html>", "text/html"), true);
    assert.equal(looksLikeEnvFile("<!DOCTYPE html><html>", "text/html"), false);
  });

  it("flags a real env body", () => {
    assert.equal(looksLikeEnvFile("DATABASE_URL=postgres://x\nAPI_KEY=abc\n", "text/plain"), true);
  });

  it("flags git config and not HTML", () => {
    assert.equal(looksLikeGitConfig("[core]\n\trepositoryformatversion = 0\n", "text/plain"), true);
    assert.equal(looksLikeGitConfig("<!DOCTYPE html>", "text/html"), false);
  });

  it("notes missing HSTS on https", () => {
    const headers = new Headers({ "x-content-type-options": "nosniff", "x-frame-options": "DENY" });
    const findings = headerFindings("https://app.example", headers, "https://app.example/");
    assert.ok(findings.some((finding) => finding.message.includes("Strict-Transport-Security")));
  });
});
