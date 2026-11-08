import { describe, it, expect } from "vitest";
import { pickLang, ES_COUNTRIES } from "@/lib/lang";

describe("language choice (Spanish only in Spanish-speaking countries)", () => {
  it("uses the time zone of a Spanish-speaking country", () => {
    for (const tz of ["Europe/Madrid", "Atlantic/Canary", "Africa/Ceuta", "America/Mexico_City", "America/Bogota", "America/Argentina/Buenos_Aires", "America/Santiago", "America/Lima", "America/Caracas", "America/Guayaquil", "America/Guatemala", "America/Havana", "America/La_Paz", "America/Santo_Domingo", "America/Tegucigalpa", "America/Asuncion", "America/El_Salvador", "America/Managua", "America/Costa_Rica", "America/Panama", "America/Montevideo", "America/Puerto_Rico", "Africa/Malabo"])
      expect(pickLang({ tz }), tz).toBe("es");
  });
  it("is English everywhere else, whatever the browser language", () => {
    for (const tz of ["Europe/London", "America/New_York", "America/Los_Angeles", "Europe/Paris", "Asia/Tokyo", "America/Sao_Paulo", "Europe/Lisbon", "", "UTC"])
      expect(pickLang({ tz }), tz).toBe("en");
  });
  it("prefers the Cloudflare country saved from an earlier visit", () => {
    expect(pickLang({ geo: "MX", tz: "Europe/London" })).toBe("es");
    expect(pickLang({ geo: "GB", tz: "Europe/Madrid" })).toBe("en");
    expect(pickLang({ geo: "XX", tz: "Europe/Madrid" })).toBe("es");
    expect(pickLang({ geo: "garbage", tz: "Europe/London" })).toBe("en");
  });
  it("an explicit choice always wins", () => {
    expect(pickLang({ q: "en", geo: "ES", tz: "Europe/Madrid" })).toBe("en");
    expect(pickLang({ q: "es", geo: "US" })).toBe("es");
    expect(pickLang({ saved: "es", geo: "US", tz: "America/New_York" })).toBe("es");
    expect(pickLang({ saved: "en", tz: "Europe/Madrid" })).toBe("en");
    expect(pickLang({ q: "es", saved: "en" })).toBe("es");
  });
  it("lists the 21 Spanish-speaking countries", () => {
    expect(ES_COUNTRIES.size).toBe(21);
    expect(ES_COUNTRIES.has("BR")).toBe(false);
  });
});
