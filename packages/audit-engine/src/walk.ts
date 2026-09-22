import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  ".next",
  "coverage",
  "vendor",
  "target",
  "__pycache__",
  ".venv",
  "venv",
  "out",
]);

const SKIP_FILES = /\.(png|jpe?g|gif|webp|ico|pdf|zip|gz|woff2?|mp4|lock|map|min\.js)$/i;
const MAX_FILE_BYTES = 512_000;
const MAX_FILES = 2_000;

export type RepoFile = {
  relativePath: string;
  content: string;
};

export function walkRepoFiles(repoPath: string, extensions?: Set<string>): RepoFile[] {
  const files: RepoFile[] = [];

  function visit(dir: string) {
    if (files.length >= MAX_FILES) {
      return;
    }
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (files.length >= MAX_FILES) {
        return;
      }
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith(".")) {
          visit(full);
        }
        continue;
      }
      if (!entry.isFile() || SKIP_FILES.test(entry.name)) {
        continue;
      }
      if (extensions && !extensions.has(extOf(entry.name))) {
        continue;
      }
      try {
        const stat = statSync(full);
        if (stat.size > MAX_FILE_BYTES) {
          continue;
        }
        files.push({
          relativePath: relative(repoPath, full).replaceAll("\\", "/"),
          content: readFileSync(full, "utf8"),
        });
      } catch {
        // skip unreadable files
      }
    }
  }

  visit(repoPath);
  return files;
}

function extOf(name: string): string {
  const index = name.lastIndexOf(".");
  return index === -1 ? "" : name.slice(index).toLowerCase();
}
