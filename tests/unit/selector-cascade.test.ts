import { describe, it, expect } from "vitest";
import * as cheerio from "cheerio";
import {
  trySelectors,
  trySelectorsAttr,
  trySelectorsNumber,
  parsePrice,
} from "@/lib/scrapers/selector-cascade";

describe("trySelectors", () => {
  it("returns the first matching non-empty text", () => {
    const $ = cheerio.load(
      `<div><h1 id="primary"></h1><h2 class="fallback">Fallback Title</h2></div>`
    );
    expect(trySelectors($, ["#primary", ".fallback"])).toBe("Fallback Title");
  });

  it("returns null when nothing matches", () => {
    const $ = cheerio.load(`<div></div>`);
    expect(trySelectors($, ["#nope", ".also-nope"])).toBeNull();
  });

  it("ignores whitespace-only matches", () => {
    const $ = cheerio.load(
      `<div><h1 id="primary">   </h1><h2 class="fallback">Real</h2></div>`
    );
    expect(trySelectors($, ["#primary", ".fallback"])).toBe("Real");
  });
});

describe("trySelectorsAttr", () => {
  it("reads an attribute from the first matching selector", () => {
    const $ = cheerio.load(
      `<img id="primary" src="" /><img class="fallback" src="https://example.com/x.jpg" />`
    );
    expect(trySelectorsAttr($, ["#primary", ".fallback"], "src")).toBe(
      "https://example.com/x.jpg"
    );
  });
});

describe("parsePrice", () => {
  it("parses simple integer with currency prefix", () => {
    expect(parsePrice("SAR 199")).toBe(199);
  });
  it("parses comma thousands + dot decimal", () => {
    expect(parsePrice("$1,234.56")).toBeCloseTo(1234.56);
  });
  it("parses European-style dot thousands + comma decimal", () => {
    expect(parsePrice("1.234,56 €")).toBeCloseTo(1234.56);
  });
  it("parses single-comma decimal", () => {
    expect(parsePrice("199,99")).toBeCloseTo(199.99);
  });
  it("parses Arabic-Indic digits", () => {
    expect(parsePrice("١٢٣٤")).toBe(1234);
  });
  it("parses Persian digits with separators", () => {
    expect(parsePrice("۱٬۲۳۴.۵۶")).toBeCloseTo(1234.56);
  });
  it("returns null on empty", () => {
    expect(parsePrice("")).toBeNull();
    expect(parsePrice("not a price")).toBeNull();
  });
});

describe("trySelectorsNumber", () => {
  it("returns the first parseable price", () => {
    const $ = cheerio.load(
      `<span class="a">N/A</span><span class="b">SAR 1,299.00</span>`
    );
    expect(trySelectorsNumber($, [".missing", ".a", ".b"])).toBeCloseTo(1299);
  });
});
