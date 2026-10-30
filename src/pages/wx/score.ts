// Types and scoring for /weather (shared by the page and the map).
export type Home = { k: "h" | "n"; s: string; dest?: string; n: number; p?: number | null; t: string; i?: string | null; sqm?: number | null; bd?: number | null; la: number; lo: number };
export type Place = {
  id: string; name: string; region?: string | null; cc: string; la: number; lo: number; kind: "homes" | "spot" | "ebc";
  days: number; m: number[]; hi: number[]; lo2: number[]; rain: number; sun?: number | null; rh?: number | null; winter: number; summer: number;
  sea: number; air: number; iata: string; pm: number; hom?: number | null; homYear?: string | null;
  n: number; best?: number | null; from?: number | null; img?: string | null; homes: Home[];
};

export const cl = (x: number) => Math.max(0, Math.min(1, x));
export const parts = (p: Place) => ({
  weather: cl(p.days / 270),
  air: cl((35 - p.pm) / 30),
  safety: p.hom == null ? 0.5 : cl(1 - Math.log10(p.hom + 0.3) / Math.log10(20)),
  sea: cl(1 - p.sea / 100),
  homes: p.best ? cl((p.best - 70) / 30) : 0.4,
  airport: cl(1 - (p.air - 20) / 130),
});
export const overall = (p: Place) => { const s = parts(p); return Math.round(100 * (0.35 * s.weather + 0.18 * s.air + 0.18 * s.safety + 0.1 * s.sea + 0.12 * s.homes + 0.07 * s.airport)); };
// green = good, red = bad, everywhere on the page (bars, month columns, numbers)
export const tone = (v: number) => (v >= 0.75 ? "#1E9E57" : v >= 0.55 ? "#7CC242" : v >= 0.4 ? "#F2B705" : v >= 0.25 ? "#F07A1A" : "#D93B2B");
export const scoreBg = (s: number) => (s >= 80 ? "#0F6B34" : s >= 70 ? "#1E9E57" : s >= 60 ? "#7CB342" : s >= 50 ? "#E0A800" : "#E06A1A");
// the climate map keeps the classic comfortable-days ramp (purple = few, red = most), explained in its legend
export const RAMP = [[0, "#f6d4f4"], [40, "#ce96ec"], [80, "#7d78f0"], [115, "#3cafef"], [140, "#3ccd96"], [160, "#aade3c"], [175, "#ffd728"], [195, "#ff911e"], [220, "#e8371e"], [260, "#960023"]] as const;
export const dayColor = (d: number) => { let c: string = RAMP[0][1]; for (const [v, col] of RAMP) if (d >= v) c = col; return c; };
export const CONT: Record<string, string> = { ES: "eu", PT: "eu", IT: "eu", FR: "eu", GR: "eu", HR: "eu", MT: "eu", CY: "eu", BG: "eu", DK: "eu", SE: "eu", NO: "eu", GB: "eu", CH: "eu", GE: "eu", TR: "eu", AL: "eu", ME: "eu",
  US: "am", CA: "am", MX: "am", CR: "am", PA: "am", CO: "am", EC: "am", PE: "am", CL: "am", BR: "am", DO: "am", UY: "am", AR: "am",
  ID: "as", TH: "as", VN: "as", PH: "as", MY: "as", JP: "as", AU: "as", NZ: "as", LK: "as", KH: "as",
  MA: "af", TN: "af", IL: "af", KE: "af", ZA: "af", MU: "af", CV: "af", EG: "af", AE: "af", OM: "af", TZ: "af" };
