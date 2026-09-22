export type Advisory = {
  id: string;
  packageName: string;
  ecosystem: "npm" | "pypi" | "crates" | "other";
  summary: string;
};

export { queryOsv, type OsvQuery, type OsvVuln } from "./osv.js";
