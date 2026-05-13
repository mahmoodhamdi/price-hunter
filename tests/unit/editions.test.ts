import { describe, it, expect } from "vitest";
import {
  EDITIONS,
  DEFAULT_EDITION,
  listEditions,
  listSingleSkuEditions,
  getEditionFromEnv,
  COUNTRIES,
  VERTICALS,
} from "@/lib/editions";

describe("editions module", () => {
  it("contains 20 editions (4 countries x 5 verticals)", () => {
    expect(Object.keys(EDITIONS)).toHaveLength(20);
  });

  it("includes the 12 sales-matrix single-SKU editions", () => {
    const required = [
      "ksa-electronics",
      "ksa-fashion",
      "ksa-grocery",
      "ksa-pharma",
      "eg-electronics",
      "eg-fashion",
      "eg-grocery",
      "eg-pharma",
      "uae-electronics",
      "uae-fashion",
      "uae-grocery",
      "uae-pharma",
    ];
    for (const slug of required) {
      expect(EDITIONS[slug as keyof typeof EDITIONS]).toBeDefined();
      expect(EDITIONS[slug as keyof typeof EDITIONS].basePrice).toBe(1500);
      expect(EDITIONS[slug as keyof typeof EDITIONS].pricingTier).toBe(
        "single-sku"
      );
    }
  });

  it("prices country bundles at $4k", () => {
    expect(EDITIONS["ksa-general"].basePrice).toBe(4000);
    expect(EDITIONS["eg-general"].basePrice).toBe(4000);
    expect(EDITIONS["uae-general"].basePrice).toBe(4000);
  });

  it("prices vertical bundles at $5k", () => {
    expect(EDITIONS["all-electronics"].basePrice).toBe(5000);
    expect(EDITIONS["all-fashion"].basePrice).toBe(5000);
    expect(EDITIONS["all-grocery"].basePrice).toBe(5000);
    expect(EDITIONS["all-pharma"].basePrice).toBe(5000);
  });

  it("prices regional all-all at $9k", () => {
    expect(EDITIONS["all-general"].basePrice).toBe(9000);
    expect(EDITIONS["all-general"].pricingTier).toBe("regional");
  });

  it("intersects country stores with vertical stores", () => {
    const ksaElec = EDITIONS["ksa-electronics"];
    expect(ksaElec.stores).toContain("noon-sa");
    expect(ksaElec.stores).toContain("jarir");
    expect(ksaElec.stores).not.toContain("amazon-eg");
    expect(ksaElec.stores).not.toContain("jumia-eg");
  });

  it("falls back to country stores when intersection is empty", () => {
    const ksaPharma = EDITIONS["ksa-pharma"];
    expect(ksaPharma.stores.length).toBeGreaterThan(0);
  });

  it("listSingleSkuEditions returns exactly 12", () => {
    expect(listSingleSkuEditions()).toHaveLength(12);
  });

  it("getEditionFromEnv falls back to default when env unset", () => {
    delete process.env.NEXT_PUBLIC_EDITION;
    const ed = getEditionFromEnv();
    expect(ed.slug).toBe(DEFAULT_EDITION);
  });

  it("getEditionFromEnv resolves a known slug from env", () => {
    process.env.NEXT_PUBLIC_EDITION = "eg-fashion";
    const ed = getEditionFromEnv();
    expect(ed.slug).toBe("eg-fashion");
    expect(ed.country.slug).toBe("eg");
    expect(ed.vertical.slug).toBe("fashion");
    delete process.env.NEXT_PUBLIC_EDITION;
  });

  it("getEditionFromEnv falls back on unknown slug", () => {
    process.env.NEXT_PUBLIC_EDITION = "mars-flying-carpets";
    const ed = getEditionFromEnv();
    expect(ed.slug).toBe(DEFAULT_EDITION);
    delete process.env.NEXT_PUBLIC_EDITION;
  });

  it("every country has at least one store", () => {
    for (const c of Object.values(COUNTRIES)) {
      expect(c.stores.length).toBeGreaterThan(0);
    }
  });

  it("every vertical has at least one category", () => {
    for (const v of Object.values(VERTICALS)) {
      expect(v.categories.length).toBeGreaterThan(0);
    }
  });

  it("listEditions returns the same count as EDITIONS keys", () => {
    expect(listEditions()).toHaveLength(Object.keys(EDITIONS).length);
  });
});
