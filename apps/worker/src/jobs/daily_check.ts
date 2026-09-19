/** Cheap scheduled dependency/advisory check — not wired. */
export async function runDailyCheck(_repoId: string): Promise<void> {
  throw new Error("daily_check job is not wired yet");
}
