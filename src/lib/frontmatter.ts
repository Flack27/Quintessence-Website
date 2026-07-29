/**
 * Minimal YAML-subset frontmatter parser: `key: value` pairs plus inline
 * `[a, b]` or block `- item` lists. Enough for the fields the Codex uses
 * without pulling in a full YAML dependency.
 */
export interface ParsedFrontmatter {
  data: Record<string, unknown>;
  content: string;
}

export function parseFrontmatter(raw: string): ParsedFrontmatter {
  const normalized = raw.replace(/^﻿/, "").replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\r?\n?([\s\S]*)$/);

  if (!match) {
    return { data: {}, content: normalized.trim() };
  }

  const [, block, body] = match;
  const data: Record<string, unknown> = {};
  const lines = block.split("\n");
  let currentListKey: string | null = null;

  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith("#")) continue;

    const listItemMatch = line.match(/^\s+-\s+(.*)$/);
    if (listItemMatch && currentListKey) {
      (data[currentListKey] as unknown[]).push(parseScalar(listItemMatch[1]));
      continue;
    }

    const kvMatch = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!kvMatch) continue;

    const [, key, rawValue] = kvMatch;
    currentListKey = null;

    if (rawValue === "") {
      data[key] = [];
      currentListKey = key;
      continue;
    }

    if (rawValue.startsWith("[") && rawValue.endsWith("]")) {
      const inner = rawValue.slice(1, -1).trim();
      data[key] = inner ? inner.split(",").map((item) => parseScalar(item.trim())) : [];
      continue;
    }

    data[key] = parseScalar(rawValue);
  }

  return { data, content: body.replace(/^\n+/, "") };
}

function parseScalar(value: string): unknown {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed !== "" && !Number.isNaN(Number(trimmed))) return Number(trimmed);
  return trimmed;
}
