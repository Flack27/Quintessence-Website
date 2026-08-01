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

export interface RepoFile {
  path: string;
  sha: string;
  content: string;
}

/** Fetches a single file's decoded text content and current sha (needed to delete or update it). */
export async function getContentFile(path: string): Promise<RepoFile | null> {
  const { owner, repo, branch } = repoConfig();
  const url = new URL(`${API_BASE}/repos/${owner}/${repo}/contents/${path}`);
  if (branch) url.searchParams.set("ref", branch);

  const response = await fetch(url, { headers: headers() });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`GitHub contents fetch failed: ${response.status} ${await response.text()}`);
  }

  const data = (await response.json()) as { sha: string; content: string };
  return { path, sha: data.sha, content: Buffer.from(data.content, "base64").toString("utf-8") };
}

export interface DirectoryEntry {
  path: string;
  sha: string;
  type: string;
}

/** Lists the immediate entries of a folder in the repo (used to delete every file a guide owns). */
export async function listDirectory(path: string): Promise<DirectoryEntry[]> {
  const { owner, repo, branch } = repoConfig();
  const url = new URL(`${API_BASE}/repos/${owner}/${repo}/contents/${path}`);
  if (branch) url.searchParams.set("ref", branch);

  const response = await fetch(url, { headers: headers() });
  if (response.status === 404) return [];
  if (!response.ok) {
    throw new Error(`GitHub directory listing failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) return [];
  return data.map((entry: { path: string; sha: string; type: string }) => ({
    path: entry.path,
    sha: entry.sha,
    type: entry.type,
  }));
}

export interface CommitAuthor {
  name: string;
  email: string;
}

export async function createContentFile(options: {
  path: string;
  content: string;
  /** "utf-8" (default) encodes `content` as text; "base64" treats it as already-encoded binary data. */
  encoding?: "utf-8" | "base64";
  message: string;
  author: CommitAuthor;
}): Promise<{ commitUrl: string }> {
  const { owner, repo, branch } = repoConfig();

  const response = await fetch(`${API_BASE}/repos/${owner}/${repo}/contents/${options.path}`, {
    method: "PUT",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify({
      message: options.message,
      content:
        options.encoding === "base64"
          ? options.content
          : Buffer.from(options.content, "utf-8").toString("base64"),
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

export async function deleteContentFile(options: {
  path: string;
  sha: string;
  message: string;
  author: CommitAuthor;
}): Promise<void> {
  const { owner, repo, branch } = repoConfig();

  const response = await fetch(`${API_BASE}/repos/${owner}/${repo}/contents/${options.path}`, {
    method: "DELETE",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify({
      message: options.message,
      sha: options.sha,
      branch,
      author: options.author,
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub delete failed: ${response.status} ${await response.text()}`);
  }
}
