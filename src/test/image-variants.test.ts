// Ronda 26: src/data/imageVariants.ts (packed, used by the app) says the same as src/data/image-variants.json.
import { expect, it } from "vitest";
import json from "@/data/image-variants.json";
import { smallVariant, variantKeys } from "@/data/imageVariants";

it("the packed list and the JSON name the same photos and copies", () => {
  const m = json as Record<string, string>;
  expect(variantKeys().sort()).toEqual(Object.keys(m).sort());
  for (const [k, v] of Object.entries(m)) expect(smallVariant(k)).toBe(v);
  expect(smallVariant("/finds/not-a-photo-0.webp")).toBeUndefined();
});
