import type { AuditFinding, AuditResult } from "@drift-bot/types";
import { walkRepoFiles } from "../walk.js";
import { findSiteUrl } from "./urls.js";

const PROBES = [
  { path: "/.env", kind: "env" as const },
  { path: "/.env.local", kind: "env" as const },
  { path: "/.env.production", kind: "env" as const },
  { path: "/.git/config", kind: "git" as const },
  { path: "/.git/HEAD", kind: "git-head" as const },
];

const TIMEOUT_MS = 8_000;

export async function runSurfaceAudit(repoPath: string): Promise<AuditResult> {
  const files = walkRepoFiles(repoPath);
  const site = findSiteUrl(files);
  if (!site) {
    return {
      tool: "surface",
      ok: true,
      message:
        "No public site URL in this repo. I only check a homepage from package.json, CNAME, vercel.json, or the README. This is not a live bot-attack feed.",
      findings: [],
    };
  }

  try {
    const home = await fetchSafe(new URL(site).origin);
    if (!home) {
      return {
        tool: "surface",
        ok: false,
        message: `Found ${site} in the repo, but it did not answer. Try again later.`,
        findings: [],
      };
    }

    const origin = new URL(home.url).origin;
    const findings: AuditFinding[] = [
      ...headerFindings(origin, home.headers, home.url),
      ...(await probeExposedFiles(origin)),
    ];

    return {
      tool: "surface",
      ok: true,
      message:
        findings.filter((item) => item.severity !== "info").length === 0
          ? `Checked ${origin}. Door looks closed. This is not a live traffic feed. I cannot see bots hitting the site.`
          : `Checked ${origin}. Something looks publicly readable or headers are thin. This is a door check, not a live bot-attack alert.`,
      findings,
    };
  } catch {
    return {
      tool: "surface",
      ok: false,
      message: "Couldn't reach the site URL I found in the repo.",
      findings: [],
    };
  }
}

export function looksLikeHtmlShell(body: string, contentType: string): boolean {
  if (/text\/html/i.test(contentType)) {
    return true;
  }
  const start = body.trimStart().slice(0, 200).toLowerCase();
  return start.startsWith("<!doctype html") || start.startsWith("<html");
}

export function looksLikeEnvFile(body: string, contentType: string): boolean {
  if (looksLikeHtmlShell(body, contentType)) {
    return false;
  }
  const lines = body.split("\n").slice(0, 40);
  const hits = lines.filter((line) => /^[A-Za-z_][A-Za-z0-9_]*\s*=/.test(line.trim())).length;
  return hits >= 2 || /^(?:DATABASE_URL|SECRET_KEY|API_KEY|PRIVATE_KEY)=/m.test(body);
}

export function looksLikeGitConfig(body: string, contentType: string): boolean {
  if (looksLikeHtmlShell(body, contentType)) {
    return false;
  }
  return /\[core\]/.test(body) || /\[remote\s+"origin"\]/.test(body);
}

export function looksLikeGitHead(body: string, contentType: string): boolean {
  if (looksLikeHtmlShell(body, contentType)) {
    return false;
  }
  return /^ref:\s+refs\//.test(body.trim()) || /^[a-f0-9]{40}\s*$/.test(body.trim());
}

export function headerFindings(origin: string, headers: Headers, finalUrl: string): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const https = finalUrl.startsWith("https:");
  const csp = headers.get("content-security-policy") ?? "";
  const frame = headers.get("x-frame-options") ?? "";
  const hsts = headers.get("strict-transport-security") ?? "";
  const xcto = headers.get("x-content-type-options") ?? "";

  if (https && !hsts) {
    findings.push({
      severity: "P2",
      tool: "surface",
      message: `${origin} is on HTTPS but has no Strict-Transport-Security header.`,
      file: origin,
    });
  }
  if (!frame && !/frame-ancestors/i.test(csp)) {
    findings.push({
      severity: "P2",
      tool: "surface",
      message: `${origin} has no X-Frame-Options and no CSP frame-ancestors. The page can be framed.`,
      file: origin,
    });
  }
  if (!xcto) {
    findings.push({
      severity: "info",
      tool: "surface",
      message: `${origin} has no X-Content-Type-Options. Cheap add: nosniff.`,
      file: origin,
    });
  }
  if (!csp) {
    findings.push({
      severity: "info",
      tool: "surface",
      message: `${origin} has no Content-Security-Policy.`,
      file: origin,
    });
  }
  return findings;
}

async function probeExposedFiles(origin: string): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = [];
  for (const probe of PROBES) {
    const target = `${origin}${probe.path}`;
    const response = await fetchSafe(target);
    if (!response || response.status !== 200 || response.body.length === 0) {
      continue;
    }
    if (new URL(response.url).origin !== origin) {
      continue;
    }
    if (probe.kind === "env" && looksLikeEnvFile(response.body, response.contentType)) {
      findings.push({
        severity: "P0",
        tool: "surface",
        message: `${target} is publicly readable and looks like an env file. Rotate anything in it. This is an open door, not proof someone already used it.`,
        file: target,
      });
    }
    if (probe.kind === "git" && looksLikeGitConfig(response.body, response.contentType)) {
      findings.push({
        severity: "P0",
        tool: "surface",
        message: `${target} is publicly readable. The git repo may be downloadable. This is an open door, not a live attack alert.`,
        file: target,
      });
    }
    if (probe.kind === "git-head" && looksLikeGitHead(response.body, response.contentType)) {
      findings.push({
        severity: "P1",
        tool: "surface",
        message: `${target} is publicly readable. Check that /.git is not served.`,
        file: target,
      });
    }
  }
  return findings;
}

async function fetchSafe(url: string): Promise<{
  status: number;
  url: string;
  headers: Headers;
  contentType: string;
  body: string;
} | null> {
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: { "user-agent": "DriftBot-surface" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const contentType = response.headers.get("content-type") ?? "";
    const raw = await response.arrayBuffer();
    const slice = raw.byteLength > 16_384 ? raw.slice(0, 16_384) : raw;
    const body = new TextDecoder("utf-8", { fatal: false }).decode(slice);
    return {
      status: response.status,
      url: response.url,
      headers: response.headers,
      contentType,
      body,
    };
  } catch {
    return null;
  }
}
