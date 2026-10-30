import { describe, expect, it, vi } from "vitest";
import { parseDelimited, contactCandidates } from "@/lib/contact-import";
import { csvText, fetchAll, requireResult, safeProjectUrl, saveChange } from "@/lib/platform";
import { listingHook } from "@/lib/listing-integrity";
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("contact imports and complete exports", () => {
  it("parses quoted separators, multiline values and escaped quotes without shifting contacts", () => {
    const parsed = parseDelimited('name,email,notes\r\n"Doe, Jane",jane@example.test,"Line 1\nLine ""2"""');
    expect(parsed.rows[1]).toEqual(['Doe, Jane','jane@example.test','Line 1\nLine "2"']);
    expect(parsed.issues).toHaveLength(0);
  });
  it("supports semicolon exports, removes normalized duplicates and identifies skipped rows", () => {
    const result = contactCandidates('Name;Email;Phone\nJane;JANE@example.test;+34 600 123 456\nJane;jane@example.test;0034 600 123 456\nInvalid;bad;');
    expect(result.contacts).toHaveLength(2); expect(result.duplicates).toBe(2);
    expect(result.issues).toEqual([{ row: 4, message: "No valid email or phone found; row skipped." }]);
  });
  it("rejects an unfinished quoted field rather than uploading a partial interpretation", () => {
    expect(contactCandidates('email,notes\na@example.test,"unfinished').invalid).toBe(true);
  });
  it("escapes spreadsheet formulas and retains quotes, commas and newlines", () => {
    expect(csvText([['=HYPERLINK("bad")','hello,\nworld',42]])).toBe('"\'=HYPERLINK(""bad"")","hello,\nworld","42"');
  });
  it("visits all pages including a final full page", async () => {
    const source = Array.from({ length: 1000 }, (_, id) => ({ id }));
    const query = vi.fn(async (from: number,to: number) => ({ data: source.slice(from,to+1), count: source.length }));
    expect(await fetchAll(query)).toHaveLength(1000); expect(query).toHaveBeenCalledTimes(2);
  });
  it("fails an export when a later page fails; never returns incomplete success", async () => {
    let page = 0;
    await expect(fetchAll(async () => ++page === 1 ? { data: [1,2] } : { data: [], error: { message: "Offline" } }, 2)).rejects.toThrow("Offline");
  });
});
describe("honest saves and listing information", () => {
  it("reports database and network errors as failures", async () => {
    expect(() => requireResult({ data: null, error: { message: "Denied" } })).toThrow("Denied");
    expect(await saveChange(async () => ({ data: null, error: { message: "Denied" } }))).toEqual({ ok: false });
    expect(await saveChange(async () => { throw new Error("Offline"); })).toEqual({ ok: false });
  });
  it("retains server-confirmed results", async () => {
    expect(await saveChange(async () => ({ data: { id: 4 }, error: null }))).toEqual({ ok: true, data: { id: 4 } });
  });
  it("rejects credentials and unsafe project URL protocols", () => {
    expect(safeProjectUrl("project.example.com")).toBe("https://project.example.com/");
    for (const bad of ['https://user:password@example.com', 'javascript:alert(1)', 'localhost']) expect(() => safeProjectUrl(bad)).toThrow();
  });
  it("does not show a contradictory promotional price", () => {
    expect(listingHook({ hook: 'A home for €15,200', price_eur: 16000 } as any)).toBe("");
    expect(listingHook({ hook: 'Sea view for €39,000', price_eur: 39000 } as any)).toBe('Sea view for €39,000');
    expect(listingHook({ hook: 'Sea view for €39k', price_eur: 39000 } as any)).toBe('Sea view for €39k');
  });
});
