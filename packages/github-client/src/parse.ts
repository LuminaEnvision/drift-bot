export type RepoRef = {
  owner: string;
  name: string;
  fullName: string;
};

const PART_RE = /^[A-Za-z0-9_.-]+$/;
const GITHUB_URL_RE =
  /(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/i;
const OWNER_REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

function asRef(owner: string, name: string): RepoRef | null {
  const cleanName = name.replace(/\.git$/i, "");
  if (!PART_RE.test(owner) || !PART_RE.test(cleanName) || cleanName === "." || cleanName === "..") {
    return null;
  }
  return { owner, name: cleanName, fullName: `${owner}/${cleanName}` };
}

export function parseRepoRef(input: string): RepoRef | null {
  const value = input.trim();
  if (!value) {
    return null;
  }

  const markdown = value.match(/\]\((https?:\/\/github\.com\/[^)\s]+)\)/i);
  const haystack = markdown?.[1] ?? value;

  const fromUrl = haystack.match(GITHUB_URL_RE);
  if (fromUrl) {
    return asRef(fromUrl[1], fromUrl[2]);
  }

  const firstToken = haystack.split(/\s+/)[0]?.replace(/[<>]/g, "") ?? "";
  const token = firstToken.replace(/\/+$/, "").replace(/\.git$/i, "");
  if (OWNER_REPO_RE.test(token)) {
    const [owner, name] = token.split("/");
    return asRef(owner, name);
  }

  return null;
}
