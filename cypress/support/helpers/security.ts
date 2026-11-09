import { isAbsolute, relative, resolve } from "path";

export const MAX_LOG_LENGTH = 2000;
export const MAX_VIOLATIONS = 1000;
export const MAX_SITEMAP_BYTES = 1_000_000;
export const MAX_SITEMAP_URLS = 500;

// ANSI escape sequences (CSI/OSC) and remaining C0/C1 control characters.
// eslint-disable-next-line no-control-regex
const ANSI_RE = /\u001b(?:\[[0-?]*[ -/]*[@-~]|\][^\u0007\u001b]*(?:\u0007|\u001b\\)|[@-Z\\-_])/g;
// eslint-disable-next-line no-control-regex
const CONTROL_RE = /[\u0000-\u001f\u007f-\u009f]/g;

/**
 * Neutralize untrusted text before printing it to the console/CI log.
 * Strips ANSI escapes and control characters (including newlines, which
 * could be used to forge log lines) and truncates long values.
 */
export function sanitizeForLog(value: unknown, max = MAX_LOG_LENGTH): string {
  const str = typeof value === "string" ? value : String(value);
  const clean = str.replace(ANSI_RE, "").replace(CONTROL_RE, " ");
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

export type SafeViolation = {
  url: string;
  id: string;
  description: string;
  impact: string | null;
  nodes: number;
  tags: string[];
};

const isStr = (v: unknown): v is string => typeof v === "string";

/**
 * Validate and copy only the expected fields from untrusted task input.
 * Returns null if the payload does not match the expected shape.
 */
export function parseViolations(input: unknown): SafeViolation[] | null {
  if (!Array.isArray(input) || input.length > MAX_VIOLATIONS) return null;

  const out: SafeViolation[] = [];
  for (const item of input) {
    if (typeof item !== "object" || item === null) return null;
    const { url, id, description, impact, nodes, tags } = item as Record<
      string,
      unknown
    >;

    if (!isStr(url) || !isStr(id) || !isStr(description)) return null;
    if (impact !== null && impact !== undefined && !isStr(impact)) return null;
    if (typeof nodes !== "number" || !Number.isFinite(nodes)) return null;
    if (!Array.isArray(tags) || !tags.every(isStr)) return null;

    out.push({
      url: sanitizeForLog(url, 2048),
      id: sanitizeForLog(id, 200),
      description: sanitizeForLog(description, MAX_LOG_LENGTH),
      impact: impact == null ? null : sanitizeForLog(impact, 50),
      nodes,
      tags: tags.slice(0, 50).map((t) => sanitizeForLog(t, 100)),
    });
  }
  return out;
}

/**
 * Resolve `target` against `root` and throw if it escapes `root`.
 */
export function resolveInside(root: string, ...target: string[]): string {
  const base = resolve(root);
  const full = resolve(base, ...target);
  const rel = relative(base, full);
  if (rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error(`Path escapes project root: ${full}`);
  }
  return full;
}

/**
 * Extract <loc> values from sitemap XML and keep only http(s) URLs that
 * share an origin with `baseUrl`. Deduplicated and capped.
 */
export function extractSameOriginUrls(xml: string, baseUrl: string): string[] {
  const base = new URL(baseUrl);
  const seen = new Set<string>();
  const locRe = /<loc>\s*([^<]{1,2048}?)\s*<\/loc>/g;

  for (const match of xml.matchAll(locRe)) {
    if (seen.size >= MAX_SITEMAP_URLS) break;
    let url: URL;
    try {
      url = new URL(match[1], base);
    } catch {
      continue;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") continue;
    if (url.origin !== base.origin) continue;
    seen.add(url.href);
  }
  return [...seen];
}
