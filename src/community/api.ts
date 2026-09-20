import { supabase } from "@/integrations/supabase/client";
export type Deal = {
  id: string;
  slug: string;
  title: string;
  source_url: string;
  source_domain: string;
  image_urls: string[];
  video_url?: string;
  price_eur: number;
  country: string;
  location_name: string;
  sqm?: number;
  bedrooms?: number;
  category: string;
  why_great?: string;
  hunter_handle: string;
  is_editorial_pick: boolean;
  pick_note?: string;
  rank: number;
  week_up: number;
  week_down: number;
  week_net: number;
  life_up: number;
  life_down: number;
  life_net: number;
  votes_24h: number;
  views: number;
  saves: number;
  comments: number;
  approved_at: string;
};
export type Session = {
  token: string;
  admin: boolean;
  hunter?: { handle: string; display_name: string; bio: string };
  votes: Record<string, number>;
  saved: string[];
};
export type Feed = {
  week: { id: string; label: string; starts_at: string; ends_at: string };
  rows: Deal[];
  picks: Deal[];
  total: number;
  global_deals: number;
  global_votes: number;
  weekly_votes: number;
  countries: string[];
};
export const categories = [
  ["beach", "Beach & coast"],
  ["village", "Village homes"],
  ["city", "City living"],
  ["land", "Land"],
  ["renovation", "Renovation"],
  ["new_build", "New builds"],
  ["other", "Other discoveries"],
];
export const money = (n?: number) =>
  n == null
    ? "Price on request"
    : new Intl.NumberFormat("en-IE", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
      }).format(n);
export const safeUrl = (url?: string) => !!url && /^https?:\/\//i.test(url);
export function readToken() {
  try {
    return (
      localStorage.getItem("rh_community_token") ||
      document.cookie
        .split("; ")
        .find((x) => x.startsWith("rh_visitor="))
        ?.split("=")[1] ||
      null
    );
  } catch {
    return null;
  }
}
export function storeToken(token: string) {
  try {
    localStorage.setItem("rh_community_token", token);
  } catch {
    /* Keep the current in-memory session. */
  }
  try {
    document.cookie = `rh_visitor=${token}; Max-Age=31536000; Path=/; SameSite=Lax; Secure`;
  } catch {
    /* Storage may be disabled. */
  }
}
export async function api<T = any>(
  action: string,
  token: string | null,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await (supabase.rpc as any)("community_api", {
    p_action: action,
    p_token: token,
    p_payload: payload,
  });
  if (error)
    throw new Error(
      "We could not complete that request. Please try again shortly.",
    );
  if (data?.error) throw new Error(data.error);
  return data as T;
}
export async function ranking(
  scope: string,
  country: string,
  category: string,
  offset = 0,
): Promise<Feed> {
  const { data, error } = await (supabase.rpc as any)("community_rankings", {
    p_scope: scope,
    p_country: country || null,
    p_category: category || null,
    p_limit: 24,
    p_offset: offset,
  });
  if (error) throw new Error("The ranking could not load. Please try again.");
  return data;
}
export function votePreview(
  deal: Deal,
  old: number | undefined,
  next: number,
): Deal {
  const up = deal.week_up - (old === 1 ? 1 : 0) + (next === 1 ? 1 : 0);
  const down = deal.week_down - (old === -1 ? 1 : 0) + (next === -1 ? 1 : 0);
  return { ...deal, week_up: up, week_down: down, week_net: up - down };
}
export function badge(deal: Deal, scope = "week") {
  if (deal.rank === 1 && (scope === "all" ? deal.life_net : deal.week_net) > 0)
    return scope === "all" ? "#1 all time" : "#1 this week";
  if (deal.votes_24h >= 10 && deal.week_net > 0) return "Trending";
  if (deal.votes_24h >= 3 && deal.week_net > 0) return "Rising";
  return "";
}
