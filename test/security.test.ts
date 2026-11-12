import assert from "node:assert/strict";
import {
  chmodSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";

import {
  MAX_SITEMAP_URLS,
  MAX_VIOLATIONS,
  extractSameOriginUrls,
  parseViolations,
  readBodyCapped,
  resolveInside,
  sanitizeForLog,
  VIOLATIONS_REPORT_DIR,
  VIOLATIONS_REPORT_FILE,
  VIOLATIONS_REPORT_PATH,
  validateBaseUrl,
  writeViolationsReport,
} from "../cypress/support/helpers/security.ts";

const violation = (overrides: Record<string, unknown> = {}) => ({
  url: "http://127.0.0.1:8080/index.html",
  id: "image-alt",
  description: "Ensures <img> elements have alternate text",
  impact: "critical",
  nodes: 2,
  tags: ["wcag2a", "section508"],
  ...overrides,
});

describe("sanitizeForLog", () => {
  it("strips ANSI CSI and OSC sequences", () => {
    assert.equal(sanitizeForLog("\u001b[31mred\u001b[0m"), "red");
    assert.equal(sanitizeForLog("\u001b]0;pwned\u0007title"), "title");
    assert.equal(sanitizeForLog("\u001b]8;;http://x\u001b\\link"), "link");
  });

  it("replaces newlines and other C0/C1 controls", () => {
    assert.equal(sanitizeForLog("a\nb\r\nc\td\u0085e"), "a b  c d e");
  });

  it("replaces Unicode line separators, bidi and zero-width characters", () => {
    for (const ch of ["\u2028", "\u2029", "\u202e", "\u2066", "\u200b", "\ufeff"]) {
      assert.equal(sanitizeForLog(`a${ch}b`), "a b", `U+${ch.codePointAt(0)!.toString(16)}`);
    }
  });

  it("truncates long values", () => {
    assert.equal(sanitizeForLog("abcdef", 3), "abc…");
  });

  it("stringifies non-string input", () => {
    assert.equal(sanitizeForLog(42), "42");
    assert.equal(sanitizeForLog(null), "null");
  });
});

describe("parseViolations", () => {
  it("copies only the expected fields", () => {
    const [v] = parseViolations([violation({ extra: "dropped" })])!;
    assert.deepEqual(Object.keys(v).sort(), [
      "description",
      "id",
      "impact",
      "nodes",
      "tags",
      "url",
    ]);
  });

  it("keeps string content intact for storage (sanitizing is the sink's job)", () => {
    const [v] = parseViolations([violation({ description: "line1\nline2" })])!;
    assert.equal(v.description, "line1\nline2");
  });

  it("normalizes a missing impact to null", () => {
    const [v] = parseViolations([violation({ impact: undefined })])!;
    assert.equal(v.impact, null);
  });

  it("caps string lengths and tag counts", () => {
    const [v] = parseViolations([
      violation({
        url: `http://x/${"a".repeat(10_000)}`,
        tags: Array.from({ length: 100 }, (_, i) => `t${i}`),
      }),
    ])!;
    assert.ok(v.url.length <= 8193);
    assert.equal(v.tags.length, 50);
  });

  it(`rejects more than ${MAX_VIOLATIONS} items per call`, () => {
    const many = Array.from({ length: MAX_VIOLATIONS + 1 }, () => violation());
    assert.equal(parseViolations(many), null);
    assert.equal(parseViolations(many.slice(1))?.length, MAX_VIOLATIONS);
  });

  it("rejects malformed payloads", () => {
    assert.equal(parseViolations("nope"), null);
    assert.equal(parseViolations([null]), null);
    assert.equal(parseViolations([violation({ id: 1 })]), null);
    assert.equal(parseViolations([violation({ impact: 3 })]), null);
    assert.equal(parseViolations([violation({ tags: [1] })]), null);
    assert.equal(parseViolations([violation({ tags: "wcag2a" })]), null);
  });

  it("rejects negative, fractional and non-finite node counts", () => {
    for (const nodes of [-1, 1.5, Infinity, NaN, "2"]) {
      assert.equal(parseViolations([violation({ nodes })]), null, String(nodes));
    }
    assert.equal(parseViolations([violation({ nodes: 0 })])?.[0].nodes, 0);
  });
});

describe("resolveInside", () => {
  it("allows paths inside the root", () => {
    assert.equal(resolveInside("/root", "a", "b.json"), "/root/a/b.json");
    assert.equal(resolveInside("/root", "..foo"), "/root/..foo");
  });

  it("throws on paths that escape the root", () => {
    assert.throws(() => resolveInside("/root", ".."));
    assert.throws(() => resolveInside("/root", "../etc/passwd"));
    assert.throws(() => resolveInside("/root", "a/../../x"));
    assert.throws(() => resolveInside("/root", "/etc/passwd"));
  });

  it("requires an absolute root", () => {
    assert.throws(() => resolveInside("relative", "a"), /absolute/);
  });

  it("rejects NUL bytes in any segment", () => {
    const nul = String.fromCharCode(0);
    assert.throws(() => resolveInside(`/root${nul}`, "a"), /NUL/);
    assert.throws(() => resolveInside("/root", `a${nul}.json`), /NUL/);
  });
});

describe("extractSameOriginUrls", () => {
  const base = "http://127.0.0.1:8080";
  const sitemap = (...locs: string[]) =>
    `<urlset>${locs.map((l) => `<url><loc>${l}</loc></url>`).join("")}</urlset>`;

  it("keeps same-origin http(s) URLs and drops everything else", () => {
    const xml = sitemap(
      "http://127.0.0.1:8080/a.html",
      "  http://127.0.0.1:8080/b.html\n",
      "/relative.html",
      "//127.0.0.1:8080/protocol-relative.html",
      "http://evil.example/",
      "http://127.0.0.1:9999/other-port",
      "https://127.0.0.1:8080/other-scheme",
      "javascript:alert(1)",
      "file:///etc/passwd",
      "http://[bad"
    );
    assert.deepEqual(extractSameOriginUrls(xml, base), [
      "http://127.0.0.1:8080/a.html",
      "http://127.0.0.1:8080/b.html",
      "http://127.0.0.1:8080/relative.html",
      "http://127.0.0.1:8080/protocol-relative.html",
    ]);
  });

  it("decodes XML entities in <loc>", () => {
    const xml = sitemap("http://127.0.0.1:8080/p?a=1&amp;b=2&#38;c=3");
    assert.deepEqual(extractSameOriginUrls(xml, base), [
      "http://127.0.0.1:8080/p?a=1&b=2&c=3",
    ]);
  });

  it("deduplicates and caps the result", () => {
    const locs = Array.from(
      { length: MAX_SITEMAP_URLS + 10 },
      (_, i) => `/p${i}.html`
    );
    assert.equal(
      extractSameOriginUrls(sitemap(...locs, ...locs), base).length,
      MAX_SITEMAP_URLS
    );
  });
});

describe("validateBaseUrl", () => {
  it("accepts http and https", () => {
    assert.equal(validateBaseUrl("http://127.0.0.1:8080"), "http://127.0.0.1:8080/");
    assert.equal(validateBaseUrl("https://example.com/app"), "https://example.com/app");
  });

  it("rejects other schemes, garbage and missing values", () => {
    for (const v of ["file:///etc", "javascript:alert(1)", "not a url", "", null, undefined]) {
      assert.throws(() => validateBaseUrl(v), String(v));
    }
  });
});

describe("writeViolationsReport", () => {
  let root: string;
  let outside: string;
  let reportDir: string;
  let reportFile: string;

  beforeEach(() => {
    root = realpathSync(mkdtempSync(join(tmpdir(), "a11y-root-")));
    outside = realpathSync(mkdtempSync(join(tmpdir(), "a11y-outside-")));
    reportDir = join(root, ...VIOLATIONS_REPORT_DIR);
    reportFile = join(reportDir, VIOLATIONS_REPORT_FILE);
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  });

  it("writes only to the fixed report path", () => {
    assert.equal(VIOLATIONS_REPORT_PATH, "cypress/data/axeViolations.json");
    assert.equal(writeViolationsReport(root, "[]"), reportFile);
    assert.equal(readFileSync(reportFile, "utf8"), "[]");
  });

  it("uses owner-only permissions and leaves no temp files", () => {
    writeViolationsReport(root, "[]");
    assert.equal(statSync(reportFile).mode & 0o777, 0o600);
    assert.equal(statSync(reportDir).mode & 0o777, 0o700);
    assert.deepEqual(readdirSync(reportDir), [VIOLATIONS_REPORT_FILE]);
  });

  it("tightens a pre-existing group/world-writable report directory", () => {
    mkdirSync(reportDir, { recursive: true });
    chmodSync(reportDir, 0o777);
    writeViolationsReport(root, "[]");
    assert.equal(statSync(reportDir).mode & 0o777, 0o700);
  });

  it("overwrites an existing report", () => {
    writeViolationsReport(root, "first");
    writeViolationsReport(root, "second");
    assert.equal(readFileSync(reportFile, "utf8"), "second");
  });

  it("replaces a symlinked report file instead of writing through it", () => {
    const victim = join(outside, "victim.txt");
    writeFileSync(victim, "original");
    mkdirSync(reportDir, { recursive: true });
    symlinkSync(victim, reportFile);

    writeViolationsReport(root, "payload");

    assert.equal(readFileSync(victim, "utf8"), "original");
    assert.equal(lstatSync(reportFile).isSymbolicLink(), false);
  });

  it("refuses a symlinked report directory", () => {
    mkdirSync(join(root, "cypress"));
    symlinkSync(outside, reportDir);
    assert.throws(() => writeViolationsReport(root, "payload"), /symlink/);
    assert.deepEqual(readdirSync(outside), []);
  });

  it("refuses a report directory reached through a symlinked ancestor", () => {
    mkdirSync(join(outside, "data"));
    symlinkSync(outside, join(root, "cypress"));
    assert.throws(
      () => writeViolationsReport(root, "payload"),
      /outside project root/
    );
    assert.deepEqual(readdirSync(join(outside, "data")), []);
  });

  it("refuses when the report path is a file, not a directory", () => {
    mkdirSync(join(root, "cypress"));
    writeFileSync(reportDir, "not a dir");
    assert.throws(() => writeViolationsReport(root, "payload"));
  });

  it("rejects a relative, missing or non-directory project root", () => {
    assert.throws(() => writeViolationsReport("relative/root", "x"), /absolute/);
    assert.throws(() => writeViolationsReport(join(root, "missing"), "x"), /ENOENT/);
    const file = join(root, "file.txt");
    writeFileSync(file, "x");
    assert.throws(() => writeViolationsReport(file, "x"), /not a directory/);
  });

  it("enforces the byte limit on UTF-8 size, not string length", () => {
    // 4 characters, 12 bytes.
    assert.throws(() => writeViolationsReport(root, "€€€€", 10), /limit/);
    assert.doesNotThrow(() => writeViolationsReport(root, "€€€", 10));
  });
});

describe("readBodyCapped", () => {
  const streamOf = (chunks: string[]) =>
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (const c of chunks) controller.enqueue(new TextEncoder().encode(c));
        controller.close();
      },
    });

  it("returns the body when under the limit", async () => {
    assert.equal(await readBodyCapped(new Response("<urlset/>"), 100), "<urlset/>");
  });

  it("rejects early on a large Content-Length", async () => {
    const res = new Response("small", { headers: { "content-length": "5000" } });
    await assert.rejects(readBodyCapped(res, 100), /too large/);
  });

  it("stops reading once a streamed body passes the limit", async () => {
    const res = new Response(streamOf(["a".repeat(60), "b".repeat(60)]));
    await assert.rejects(readBodyCapped(res, 100), /too large/);
  });

  it("counts bytes, not characters", async () => {
    await assert.rejects(readBodyCapped(new Response("€".repeat(40)), 100), /too large/);
  });
});
