import { describe, expect, it } from "vitest";
import { srcSet } from "@/lib/rh";

describe("responsive listing image variants", () => {
  it("does not invent missing mobile variants for listing photos", () => {
    expect(srcSet("/images/ebc/ebc-cabin-ext.webp")).toBeUndefined();
    expect(srcSet("/images/ebc/ebc-cabin-int.webp")).toBeUndefined();
  });

  it("keeps variants that exist in the published assets", () => {
    expect(srcSet("/images/ebc/ebc-card-v2.webp")).toContain("ebc-card-v2-s.webp");
    expect(srcSet("/finds/acquappesa-bedroom.webp")).toContain("acquappesa-bedroom-s.webp");
  });
});
