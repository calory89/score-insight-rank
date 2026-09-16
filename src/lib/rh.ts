import { supabase } from "@/integrations/supabase/client";

export const db = supabase as any;
export const MAX_PRICE = 100000;
export const eur = (n: number) => "€" + Math.round(n).toLocaleString("en-GB");
export const FLAG: Record<string, string> = { Italy: "🇮🇹", Spain: "🇪🇸", Portugal: "🇵🇹", France: "🇫🇷", Greece: "🇬🇷", Croatia: "🇭🇷", Bulgaria: "🇧🇬", Romania: "🇷🇴", Japan: "🇯🇵", Sweden: "🇸🇪", Norway: "🇳🇴", Denmark: "🇩🇰", Finland: "🇫🇮", Germany: "🇩🇪", Turkey: "🇹🇷", Albania: "🇦🇱", Indonesia: "🇮🇩", Nordics: "❄️", Asia: "🌏", Other: "🌍" };
export const norm = (c: string | null | undefined) => { if (!c) return "Other"; if (c === "Scandinavia") return "Nordics"; if (c === "International" || c === "Europe") return "Other"; return c; };
export const slug = (c: string) => c.toLowerCase().replace(/[^a-z]+/g, "-");
export const unslug = (s: string, known: string[]) => known.find((k) => slug(k) === s) || s;
export const isNew = (d: string | null) => !!d && Date.now() - new Date(d).getTime() < 7 * 86400000;
export const cleanCap = (c: string | null) => (c || "").replace(/🏠?\s*Listing is up on Patreon[^.✨\n]*[.✨]?/gi, "").replace(/#\w+/g, "").replace(/\s+/g, " ").trim();

export type IG = { id: string; source_account: string; shortcode: string; caption: string | null; image_urls: string[] | null; posted_at: string | null; location_name: string | null; country_guess: string | null; price_eur: number | null; price_raw: string | null; likes: number | null; is_beach: boolean | null; price_in_image?: boolean; lat?: number | null; lng?: number | null; sqm?: number | null; bedrooms?: number | null; post_url?: string; caption_en?: string | null; hook?: string | null; rank_score?: number | null };

export const EBC: IG = { id: "ebc", source_account: "ecobeachcity", shortcode: "ecobeachcity", caption: "Beachfront cabin in a new eco village. 80-year lease that extends. Payable in instalments.", image_urls: ["/images/ebc/ebc-card.jpg"], posted_at: null, location_name: "Mamboro, Sumba", country_guess: "Indonesia", price_eur: 11500, price_raw: null, likes: null, is_beach: true, lat: -9.4, lng: 119.6 };
export const CALENDLY = "https://calendly.com/equinoxinvestmentgroup/eco-beach-city-info-call";

const sid = () => { try { let s = localStorage.getItem("rh_sid"); if (!s) { s = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem("rh_sid", s); } return s; } catch { return "anon"; } };
export const track = async (event: string, extra: { find?: string; meta?: any } = {}) => {
  try {
    const { data } = await supabase.auth.getSession();
    await db.from("rh_events").insert({ sid: sid(), user_id: data.session?.user.id || null, event, path: location.pathname, find_shortcode: extra.find || null, meta: extra.meta || null });
  } catch {}
};

export const srcSet = (u: string) => (u.endsWith(".webp") ? `${u.replace(/\.webp$/, "-s.webp")} 360w, ${u} 720w` : undefined);

// score = recency + engagement, used for default sort
export const score = (f: IG) => { if (f.rank_score != null) return f.rank_score * 10; const age = f.posted_at ? (Date.now() - new Date(f.posted_at).getTime()) / 86400000 : 60; const likes = Math.log10((f.likes || 0) + 10); return likes * 2 - age / 10; };
