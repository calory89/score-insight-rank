import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import RHNav from "@/components/realhunt/RHNav";
import RHFooter from "@/components/realhunt/RHFooter";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import useDocumentMeta from "@/hooks/useDocumentMeta";
import { Loader2, Save } from "lucide-react";

type BrandRow = {
  agent_name: string;
  agency_name: string;
  phone_e164: string;
  whatsapp_e164: string;
  email: string;
  logo_url: string;
  accent_hex: string;
  slug: string;
  bio: string;
  website_url: string;
};

const empty: BrandRow = {
  agent_name: "", agency_name: "", phone_e164: "", whatsapp_e164: "",
  email: "", logo_url: "", accent_hex: "#B8924A", slug: "", bio: "", website_url: "",
};

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="text-[12px] uppercase tracking-[0.18em] text-ink-soft font-semibold">{label}</span>
    {hint && <span className="block text-[12px] text-ink-soft mt-1">{hint}</span>}
    <div className="mt-2">{children}</div>
  </label>
);

const Brand = () => {
  useDocumentMeta({ title: "Brand settings — RealHunt", description: "Configure your agent brand for shared dossiers." });
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [row, setRow] = useState<BrandRow>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/auth/sign-in?redirect=${encodeURIComponent("/app/brand")}`);
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("agent_brand")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setRow({
          agent_name: data.agent_name || "",
          agency_name: data.agency_name || "",
          phone_e164: data.phone_e164 || "",
          whatsapp_e164: data.whatsapp_e164 || "",
          email: data.email || user.email || "",
          logo_url: data.logo_url || "",
          accent_hex: data.accent_hex || "#B8924A",
          slug: data.slug || "",
          bio: data.bio || "",
          website_url: data.website_url || "",
        });
      } else {
        setRow((r) => ({ ...r, email: user.email || "" }));
      }
      setLoading(false);
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const payload = { ...row, user_id: user.id, slug: row.slug || null };
    const { error } = await supabase
      .from("agent_brand")
      .upsert(payload, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Brand saved", description: "Your dossiers will use these details." });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-ink-soft" />
      </div>
    );
  }

  const set = <K extends keyof BrandRow>(k: K, v: BrandRow[K]) => setRow((r) => ({ ...r, [k]: v }));

  return (
    <div className="min-h-screen bg-paper">
      <RHNav />
      <main className="max-w-3xl mx-auto px-6 py-12">
        <p className="text-[11px] tracking-[0.25em] uppercase text-accent font-semibold">Settings</p>
        <h1 className="font-display text-4xl mt-2 text-ink">Your brand</h1>
        <p className="text-ink-muted mt-3">
          Used on every dossier you generate, every WhatsApp share, and your public profile at <code className="text-[12px]">/agent/your-slug</code>.
        </p>

        <div className="mt-10 space-y-6 rounded-2xl border border-hairline bg-surface p-6">
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Your name">
              <input className="rh-input" value={row.agent_name} onChange={(e) => set("agent_name", e.target.value)} placeholder="Maria Rossi" />
            </Field>
            <Field label="Agency">
              <input className="rh-input" value={row.agency_name} onChange={(e) => set("agency_name", e.target.value)} placeholder="Costa del Sol Properties" />
            </Field>
            <Field label="Phone (E.164)" hint="e.g. +34 600 123 456">
              <input className="rh-input" value={row.phone_e164} onChange={(e) => set("phone_e164", e.target.value)} placeholder="+34600123456" />
            </Field>
            <Field label="WhatsApp (E.164)" hint="Used for share-to-client deep links">
              <input className="rh-input" value={row.whatsapp_e164} onChange={(e) => set("whatsapp_e164", e.target.value)} placeholder="+34600123456" />
            </Field>
            <Field label="Email">
              <input className="rh-input" value={row.email} onChange={(e) => set("email", e.target.value)} type="email" />
            </Field>
            <Field label="Website">
              <input className="rh-input" value={row.website_url} onChange={(e) => set("website_url", e.target.value)} placeholder="https://" />
            </Field>
            <Field label="Logo URL" hint="Hosted PNG/SVG, square, 512×512+">
              <input className="rh-input" value={row.logo_url} onChange={(e) => set("logo_url", e.target.value)} placeholder="https://..." />
            </Field>
            <Field label="Accent color" hint="Hex, used on PDF dossier accents">
              <div className="flex items-center gap-3">
                <input className="rh-input flex-1" value={row.accent_hex} onChange={(e) => set("accent_hex", e.target.value)} />
                <span className="h-10 w-10 rounded-md border border-hairline" style={{ background: row.accent_hex }} />
              </div>
            </Field>
            <Field label="Public slug" hint="Letters and numbers only — used in your shareable agent profile URL">
              <input
                className="rh-input"
                value={row.slug}
                onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                placeholder="maria-rossi"
              />
            </Field>
          </div>

          <Field label="Short bio" hint="Two lines max, shown on shared dossiers">
            <textarea className="rh-input min-h-[88px]" value={row.bio} onChange={(e) => set("bio", e.target.value)} />
          </Field>

          <div className="flex items-center justify-between pt-2">
            {row.logo_url ? (
              <img src={row.logo_url} alt="Logo preview" className="h-12 w-12 rounded-md object-contain border border-hairline" />
            ) : <span className="text-[12px] text-ink-soft">No logo yet</span>}
            <button onClick={save} disabled={saving} className="rh-btn-primary">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save brand
            </button>
          </div>
        </div>
      </main>
      <RHFooter />
    </div>
  );
};

export default Brand;
