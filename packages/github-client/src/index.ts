/** GitHub App auth + typed API wrapper — not wired in this reorg. */
export function isGitHubClientConfigured(): boolean {
  return Boolean(process.env.GITHUB_APP_ID && process.env.GITHUB_APP_PRIVATE_KEY_PATH);
}

export async function getInstallationToken(_installationId: number): Promise<string> {
  throw new Error("GitHub App client is not wired yet");
}
