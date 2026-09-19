/** npm, PyPI, crates.io, GHSA clients — not wired in this reorg. */
export type Advisory = {
  id: string;
  packageName: string;
  ecosystem: "npm" | "pypi" | "crates" | "other";
  summary: string;
};

export async function fetchAdvisories(_ecosystem: Advisory["ecosystem"], _packageName: string): Promise<Advisory[]> {
  return [];
}
