// Share utilities: WhatsApp deep links + short link creation.
import { supabase } from "@/integrations/supabase/client";

export function buildWhatsAppLink(phoneE164: string | null | undefined, message: string) {
  const phone = (phoneE164 || "").replace(/[^\d]/g, "");
  const text = encodeURIComponent(message);
  return phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
}

export function buildShareMessage(opts: { title: string; score: number; url: string; agent?: string | null }) {
  const lines = [
    `${opts.title} — RealHunt score ${opts.score}/10`,
    opts.url,
  ];
  if (opts.agent) lines.push(`— ${opts.agent}`);
  return lines.join("\n");
}

function randomSlug(len = 7) {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

export async function createShortLink(targetUrl: string, opts: { ownerUserId?: string | null; analysisId?: string | null } = {}) {
  // Try a few times to avoid slug collisions.
  for (let attempt = 0; attempt < 4; attempt++) {
    const slug = randomSlug(7);
    const { data, error } = await supabase
      .from("short_links")
      .insert({
        slug,
        target_url: targetUrl,
        owner_user_id: opts.ownerUserId ?? null,
        analysis_id: opts.analysisId ?? null,
      })
      .select("slug")
      .single();
    if (!error && data) return { slug: data.slug, url: `${window.location.origin}/s/${data.slug}` };
  }
  return null;
}

export async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
