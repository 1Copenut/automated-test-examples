import {
  closeSync,
  constants,
  lstatSync,
  mkdirSync,
  openSync,
  realpathSync,
  renameSync,
  rmSync,
  writeSync,
} from "fs";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "path";

export const MAX_LOG_LENGTH = 2000;
export const MAX_VIOLATIONS = 1000; // per task call
export const MAX_TOTAL_VIOLATIONS = 50_000; // per run, across all calls
export const MAX_SITEMAP_BYTES = 1_000_000;
export const MAX_SITEMAP_URLS = 500;
export const MAX_JSON_BYTES = 50_000_000;

const MAX_URL_LENGTH = 8192;
const MAX_ID_LENGTH = 200;
const MAX_IMPACT_LENGTH = 50;
const MAX_TAGS = 50;
const MAX_TAG_LENGTH = 100;

// ANSI escape sequences (CSI/OSC) and remaining C0/C1 control characters.
// eslint-disable-next-line no-control-regex
const ANSI_RE = /\u001b(?:\[[0-?]*[ -/]*[@-~]|\][^\u0007\u001b]*(?:\u0007|\u001b\\)|[@-Z\\-_])/g;
// C0/C1 controls, plus Unicode characters that can fake line breaks or
// reorder/hide text in log viewers: zero-width and directional marks,
// line/paragraph separators, bidi embeddings/isolates, and the BOM.
// eslint-disable-next-line no-control-regex
const CONTROL_RE = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u2069\ufeff]/g;

const truncate = (str: string, max: number): string =>
  str.length > max ? `${str.slice(0, max)}…` : str;

/**
 * Neutralize untrusted text before printing it to the console/CI log.
 * Strips ANSI escapes and control/spoofing characters (including
 * newlines, which could be used to forge log lines) and truncates.
 * Apply this at the console sink, not to data that is stored.
 */
export function sanitizeForLog(value: unknown, max = MAX_LOG_LENGTH): string {
  const str = typeof value === "string" ? value : String(value);
  return truncate(str.replace(ANSI_RE, "").replace(CONTROL_RE, " "), max);
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
 * Validate untrusted task input and copy only the expected fields.
 * Strings are length-capped to bound memory but otherwise left intact;
 * escaping for output is the job of each sink (sanitizeForLog for the
 * console, JSON.stringify for the file).
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
    if (!Number.isSafeInteger(nodes) || (nodes as number) < 0) return null;
    if (!Array.isArray(tags) || !tags.every(isStr)) return null;

    out.push({
      url: truncate(url, MAX_URL_LENGTH),
      id: truncate(id, MAX_ID_LENGTH),
      description: truncate(description, MAX_LOG_LENGTH),
      impact: impact == null ? null : truncate(impact, MAX_IMPACT_LENGTH),
      nodes: nodes as number,
      tags: tags.slice(0, MAX_TAGS).map((t) => truncate(t, MAX_TAG_LENGTH)),
    });
  }
  return out;
}

/**
 * Resolve `target` against `root` and throw if it escapes `root`.
 * This is a lexical check only; it does not detect symlinks.
 */
export function resolveInside(root: string, ...target: string[]): string {
  const base = resolve(root);
  const full = resolve(base, ...target);
  if (!isInside(base, full)) {
    throw new Error(`Path escapes project root: ${full}`);
  }
  return full;
}

function isInside(base: string, full: string): boolean {
  const rel = relative(base, full);
  return !(rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel));
}

/**
 * Write `data` to `relPath` under `root` without following symlinks.
 *
 * - The parent directory is created if needed, must not be a symlink,
 *   and must really (after resolving symlinks) live inside `root`.
 * - The data goes to a fresh temp file opened with O_EXCL | O_NOFOLLOW,
 *   then is renamed over the target. rename() replaces a symlink at the
 *   target rather than writing through it.
 */
export function writeFileInside(
  root: string,
  relPath: string,
  data: string,
  maxBytes = MAX_JSON_BYTES
): string {
  const bytes = Buffer.byteLength(data, "utf8");
  if (bytes > maxBytes) {
    throw new Error(`Refusing to write ${bytes} bytes (limit ${maxBytes})`);
  }

  const target = resolveInside(root, relPath);
  const dir = dirname(target);
  mkdirSync(dir, { recursive: true, mode: 0o700 });

  if (lstatSync(dir).isSymbolicLink()) {
    throw new Error(`Refusing to write through symlinked directory: ${dir}`);
  }
  if (!isInside(realpathSync(root), realpathSync(dir))) {
    throw new Error(`Directory resolves outside project root: ${dir}`);
  }

  const tmp = join(dir, `.${basename(target)}.${process.pid}.${Date.now()}.tmp`);
  const fd = openSync(
    tmp,
    constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
    0o600
  );
  let open = true;
  try {
    writeSync(fd, data);
    closeSync(fd);
    open = false;
    renameSync(tmp, target);
  } catch (err) {
    if (open) closeSync(fd);
    rmSync(tmp, { force: true });
    throw err;
  }
  return target;
}

/**
 * Read a fetch Response body as text, aborting once it exceeds
 * `maxBytes` instead of buffering an unbounded body first.
 */
export async function readBodyCapped(
  res: Response,
  maxBytes: number
): Promise<string> {
  const declared = Number(res.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new Error(`Response too large: ${declared} bytes (limit ${maxBytes})`);
  }
  if (!res.body) return "";

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error(`Response too large: over ${maxBytes} bytes`);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

const XML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

/** Decode the predefined XML entities and numeric character references. */
function decodeXmlText(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (whole, ref: string) => {
    if (ref[0] === "#") {
      const code =
        ref[1] === "x" || ref[1] === "X"
          ? parseInt(ref.slice(2), 16)
          : parseInt(ref.slice(1), 10);
      return code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    }
    return XML_ENTITIES[ref] ?? whole;
  });
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
      url = new URL(decodeXmlText(match[1]), base);
    } catch {
      continue;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") continue;
    if (url.origin !== base.origin) continue;
    seen.add(url.href);
  }
  return [...seen];
}

/** Parse and validate a base URL; only http(s) is accepted. */
export function validateBaseUrl(value: unknown): string {
  if (typeof value !== "string" || value === "") {
    throw new Error("baseUrl must be set to an http(s) URL");
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`baseUrl is not a valid URL: ${sanitizeForLog(value, 200)}`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("baseUrl must use http or https");
  }
  return url.href;
}
