export { RESEARCH_OPERATIONS, type ResearchOperation } from "./operations.js";

/** LLM orchestration — not wired in this reorg. */
export async function runDeepResearch(_input: {
  repoPath: string;
  operationId: string;
  question?: string;
}): Promise<string> {
  return "Deep research is not wired yet.";
}
