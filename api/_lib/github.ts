import { requireEnv } from "./env";

const API_BASE = "https://api.github.com";

function repoConfig() {
  return {
    owner: requireEnv("GITHUB_OWNER"),
    repo: requireEnv("GITHUB_REPO"),
    branch: process.env.GITHUB_BRANCH || undefined,
  };
}

function headers() {
  return {
    Authorization: `Bearer ${requireEnv("GITHUB_TOKEN")}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export async function contentFileExists(path: string): Promise<boolean> {
  const { owner, repo, branch } = repoConfig();
  const url = new URL(`${API_BASE}/repos/${owner}/${repo}/contents/${path}`);
  if (branch) url.searchParams.set("ref", branch);

  const response = await fetch(url, { headers: headers() });
  if (response.status === 404) return false;
  if (!response.ok) {
    throw new Error(`GitHub contents lookup failed: ${response.status} ${await response.text()}`);
  }
  return true;
}

export interface CommitAuthor {
  name: string;
  email: string;
}

export async function createContentFile(options: {
  path: string;
  content: string;
  message: string;
  author: CommitAuthor;
}): Promise<{ commitUrl: string }> {
  const { owner, repo, branch } = repoConfig();

  const response = await fetch(`${API_BASE}/repos/${owner}/${repo}/contents/${options.path}`, {
    method: "PUT",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify({
      message: options.message,
      content: Buffer.from(options.content, "utf-8").toString("base64"),
      branch,
      author: options.author,
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub commit failed: ${response.status} ${await response.text()}`);
  }

  const data = (await response.json()) as { commit: { html_url: string } };
  return { commitUrl: data.commit.html_url };
}
