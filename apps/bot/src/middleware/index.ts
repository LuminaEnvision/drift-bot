/** Auth, rate limiting, and tier gating — not applied to live commands yet. */
export function assertPaidAccess(_telegramUserId: number): void {
  // Live /start /tier /upgrade stay ungated the same way as before this reorg.
}
