import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findSiteUrl, normalizeUrl } from "./urls.js";

describe("findSiteUrl", () => {
  it("prefers CNAME over README badges", () => {
    const url = findSiteUrl([
      { relativePath: "README.md", content: "See https://github.com/acme/app and https://img.shields.io/npm/v/x" },
      { relativePath: "CNAME", content: "app.acme.com\n" },
    ]);
    assert.equal(url, "https://app.acme.com");
  });

  it("reads package.json homepage and skips GitHub", () => {
    const url = findSiteUrl([
      {
        relativePath: "frontend/package.json",
        content: JSON.stringify({ homepage: "https://decleanup.app" }),
      },
    ]);
    assert.equal(url, "https://decleanup.app");
  });
});

describe("normalizeUrl", () => {
  it("drops github and badge hosts", () => {
    assert.equal(normalizeUrl("https://github.com/acme/app"), null);
    assert.equal(normalizeUrl("https://img.shields.io/npm/v/x.svg"), null);
  });
});
