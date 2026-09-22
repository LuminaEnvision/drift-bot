export type OsvQuery = {
  name: string;
  version: string;
  ecosystem: "npm" | "PyPI" | "crates.io";
};

export type OsvVuln = {
  id: string;
  summary: string;
};

type OsvBatchResponse = {
  results?: Array<{
    vulns?: Array<{ id?: string; summary?: string }>;
  }>;
};

const BATCH_SIZE = 64;

export async function queryOsv(queries: OsvQuery[]): Promise<Map<string, OsvVuln[]>> {
  const found = new Map<string, OsvVuln[]>();
  if (queries.length === 0) {
    return found;
  }

  for (let i = 0; i < queries.length; i += BATCH_SIZE) {
    const chunk = queries.slice(i, i + BATCH_SIZE);
    const response = await fetch("https://api.osv.dev/v1/querybatch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        queries: chunk.map((query) => ({
          package: { name: query.name, ecosystem: query.ecosystem },
          version: query.version,
        })),
      }),
    });

    if (!response.ok) {
      throw new Error("Couldn't reach the advisory database.");
    }

    const body = (await response.json()) as OsvBatchResponse;
    for (const [index, result] of (body.results ?? []).entries()) {
      const query = chunk[index];
      if (!query || !result.vulns?.length) {
        continue;
      }
      const key = `${query.ecosystem}:${query.name}@${query.version}`;
      found.set(
        key,
        result.vulns
          .filter((vuln) => vuln.id)
          .map((vuln) => ({ id: vuln.id as string, summary: vuln.summary ?? vuln.id ?? "" })),
      );
    }
  }

  return found;
}
