const SKIP_HOSTS = new Set([
  "github.com",
  "www.github.com",
  "raw.githubusercontent.com",
  "gist.github.com",
  "npmjs.com",
  "www.npmjs.com",
  "pypi.org",
  "crates.io",
  "shields.io",
  "img.shields.io",
  "badge.fury.io",
  "travis-ci.com",
  "travis-ci.org",
  "circleci.com",
  "discord.gg",
  "discord.com",
  "twitter.com",
  "x.com",
  "linkedin.com",
  "youtube.com",
  "youtu.be",
  "medium.com",
]);

const URL_RE = /https?:\/\/[^\s)<>"'`]+/gi;

export function findSiteUrl(files: Array<{ relativePath: string; content: string }>): string | null {
  const ranked: Array<{ url: string; rank: number }> = [];
  for (const file of files) {
    const name = file.relativePath.split("/").pop() ?? file.relativePath;
    if (name === "CNAME") {
      const host = file.content.trim().split(/\s+/)[0]?.replace(/\.$/, "");
      if (host && !host.includes("/") && !host.includes(" ")) {
        const url = normalizeUrl(`https://${host}`);
        if (url) {
          ranked.push({ url, rank: 0 });
        }
      }
      continue;
    }
    if (name === "package.json") {
      for (const url of urlsFromPackageJson(file.content)) {
        ranked.push({ url, rank: 1 });
      }
      continue;
    }
    if (name === "vercel.json") {
      for (const url of urlsFromVercel(file.content)) {
        ranked.push({ url, rank: 2 });
      }
      continue;
    }
    if (/^readme/i.test(name)) {
      for (const url of urlsFromText(file.content)) {
        ranked.push({ url, rank: 3 });
      }
    }
  }

  ranked.sort((a, b) => a.rank - b.rank);
  return ranked[0]?.url ?? null;
}

export function normalizeUrl(raw: string): string | null {
  let value = raw.trim().replace(/[.,);]+$/, "");
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    if (url.username || url.password) {
      return null;
    }
    const host = url.hostname.toLowerCase();
    if (SKIP_HOSTS.has(host)) {
      return null;
    }
    url.hash = "";
    url.search = "";
    if (url.pathname === "/" || url.pathname === "") {
      return url.origin;
    }
    return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
  } catch {
    return null;
  }
}

function urlsFromPackageJson(content: string): string[] {
  try {
    const manifest = JSON.parse(content) as { homepage?: unknown; url?: unknown };
    return [manifest.homepage, manifest.url]
      .filter((value): value is string => typeof value === "string")
      .map(normalizeUrl)
      .filter((url): url is string => Boolean(url));
  } catch {
    return [];
  }
}

function urlsFromVercel(content: string): string[] {
  try {
    const config = JSON.parse(content) as { alias?: unknown };
    const aliases = Array.isArray(config.alias) ? config.alias : [];
    return aliases
      .filter((value): value is string => typeof value === "string")
      .map((value) => normalizeUrl(value.includes("://") ? value : `https://${value}`))
      .filter((url): url is string => Boolean(url));
  } catch {
    return [];
  }
}

function urlsFromText(content: string): string[] {
  const found: string[] = [];
  const matches = content.match(URL_RE) ?? [];
  for (const match of matches) {
    const url = normalizeUrl(match);
    if (url) {
      found.push(url);
    }
  }
  return found;
}
