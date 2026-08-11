/**
 * Minimal YAML-subset frontmatter parser: `key: value` pairs plus inline
 * `[a, b]` or block `- item` lists. Enough for the fields the Codex uses
 * without pulling in a full YAML dependency.
 */
export interface ParsedFrontmatter {
    data: Record<string, unknown>;
    content: string;
}
export declare function parseFrontmatter(raw: string): ParsedFrontmatter;
