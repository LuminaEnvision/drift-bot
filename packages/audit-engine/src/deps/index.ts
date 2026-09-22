import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { queryOsv, type OsvQuery } from "@drift-bot/registry-clients";
import type { AuditFinding, AuditResult } from "@drift-bot/types";

type ManifestDep = OsvQuery & { file: string };

const VERSION_RE = /^[~^>=<\s]*([0-9]+\.[0-9]+\.[0-9]+[A-Za-z0-9.+-]*)/;

export async function runDepsAudit(repoPath: string): Promise<AuditResult> {
  const deps = collectDeps(repoPath);
  if (deps.length === 0) {
    return {
      tool: "deps",
      ok: true,
      message: "No npm, PyPI, or crates manifests I can read.",
      findings: [],
    };
  }

  try {
    const vulns = await queryOsv(deps);
    const findings: AuditFinding[] = [];
    for (const dep of deps) {
      const hits = vulns.get(`${dep.ecosystem}:${dep.name}@${dep.version}`) ?? [];
      for (const vuln of hits) {
        findings.push({
          severity: "P1",
          tool: "deps",
          message: `${dep.name}@${dep.version}  ${vuln.id}${vuln.summary ? `  ${vuln.summary}` : ""}`,
          file: dep.file,
        });
      }
    }

    const lockMissing =
      existsSync(join(repoPath, "package.json")) &&
      !existsSync(join(repoPath, "package-lock.json")) &&
      !existsSync(join(repoPath, "pnpm-lock.yaml")) &&
      !existsSync(join(repoPath, "yarn.lock"));
    if (lockMissing) {
      findings.push({
        severity: "info",
        tool: "deps",
        message: "No lockfile. I only checked direct npm deps.",
        file: "package.json",
      });
    }

    return {
      tool: "deps",
      ok: true,
      message:
        findings.filter((item) => item.severity !== "info").length === 0
          ? "No known CVEs in the packages I could version."
          : `Found ${findings.filter((item) => item.severity !== "info").length} advisory hits.`,
      findings,
    };
  } catch {
    return {
      tool: "deps",
      ok: false,
      message: "Couldn't reach the advisory database. Try again in a minute.",
      findings: [],
    };
  }
}

function collectDeps(repoPath: string): ManifestDep[] {
  return [...readNpm(repoPath), ...readPython(repoPath), ...readCargo(repoPath)].slice(0, 200);
}

function readNpm(repoPath: string): ManifestDep[] {
  const manifestPath = join(repoPath, "package.json");
  if (!existsSync(manifestPath)) {
    return [];
  }

  const lockVersions = readNpmLock(repoPath);
  let manifest: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as typeof manifest;
  } catch {
    return [];
  }

  const entries = { ...manifest.dependencies, ...manifest.devDependencies };
  const deps: ManifestDep[] = [];
  for (const [name, raw] of Object.entries(entries ?? {})) {
    const version = lockVersions.get(name) ?? pinnedVersion(raw);
    if (!version) {
      continue;
    }
    deps.push({ name, version, ecosystem: "npm", file: lockVersions.has(name) ? "package-lock.json" : "package.json" });
  }
  return deps;
}

function readNpmLock(repoPath: string): Map<string, string> {
  const versions = new Map<string, string>();
  const lockPath = join(repoPath, "package-lock.json");
  if (!existsSync(lockPath)) {
    return versions;
  }
  try {
    const lock = JSON.parse(readFileSync(lockPath, "utf8")) as {
      packages?: Record<string, { version?: string }>;
      dependencies?: Record<string, { version?: string }>;
    };
    for (const [path, meta] of Object.entries(lock.packages ?? {})) {
      if (!path.startsWith("node_modules/") || !meta.version) {
        continue;
      }
      const name = path.slice("node_modules/".length);
      if (!name.includes("/node_modules/") && !versions.has(name)) {
        versions.set(name, meta.version);
      }
    }
    for (const [name, meta] of Object.entries(lock.dependencies ?? {})) {
      if (meta.version && !versions.has(name)) {
        versions.set(name, meta.version);
      }
    }
  } catch {
    return versions;
  }
  return versions;
}

function readPython(repoPath: string): ManifestDep[] {
  const file = join(repoPath, "requirements.txt");
  if (!existsSync(file)) {
    return [];
  }
  const deps: ManifestDep[] = [];
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("-")) {
      continue;
    }
    const match = trimmed.match(/^([A-Za-z0-9_.-]+)\s*==\s*([0-9A-Za-z.+-]+)/);
    if (match) {
      deps.push({ name: match[1], version: match[2], ecosystem: "PyPI", file: "requirements.txt" });
    }
  }
  return deps;
}

function readCargo(repoPath: string): ManifestDep[] {
  const file = join(repoPath, "Cargo.toml");
  if (!existsSync(file)) {
    return [];
  }
  const deps: ManifestDep[] = [];
  let inDeps = false;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("[")) {
      inDeps = trimmed === "[dependencies]" || trimmed === "[dev-dependencies]";
      continue;
    }
    if (!inDeps) {
      continue;
    }
    const match = trimmed.match(/^([A-Za-z0-9_-]+)\s*=\s*"([^"]+)"/);
    if (match) {
      const version = pinnedVersion(match[2]);
      if (version) {
        deps.push({ name: match[1], version, ecosystem: "crates.io", file: "Cargo.toml" });
      }
    }
  }
  return deps;
}

function pinnedVersion(raw: string): string | null {
  if (!raw || raw.includes("workspace") || raw.includes("catalog:") || raw === "*" || raw.startsWith("file:")) {
    return null;
  }
  const match = raw.match(VERSION_RE);
  return match?.[1] ?? null;
}
