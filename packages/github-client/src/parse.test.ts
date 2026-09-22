import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseRepoRef } from "./parse.js";

describe("parseRepoRef", () => {
  it("accepts owner/repo and GitHub URLs", () => {
    assert.deepEqual(parseRepoRef("facebook/react"), {
      owner: "facebook",
      name: "react",
      fullName: "facebook/react",
    });
    assert.equal(parseRepoRef("https://github.com/facebook/react.git")?.fullName, "facebook/react");
    assert.equal(parseRepoRef("github.com/facebook/react/")?.fullName, "facebook/react");
    assert.equal(
      parseRepoRef("https://github.com/facebook/react/tree/main/packages")?.fullName,
      "facebook/react",
    );
    assert.equal(
      parseRepoRef("check this https://github.com/facebook/react please")?.fullName,
      "facebook/react",
    );
  });

  it("rejects junk", () => {
    assert.equal(parseRepoRef(""), null);
    assert.equal(parseRepoRef("just-one"), null);
    assert.equal(parseRepoRef("https://gitlab.com/foo/bar"), null);
    assert.equal(parseRepoRef("foo/bar/baz"), null);
  });
});
