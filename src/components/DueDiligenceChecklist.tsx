import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, ClipboardList, ChevronDown, ChevronUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ChecklistItem {
  id: string;
  category: string;
  label: string;
  completed: boolean;
}

const TEMPLATES: Record<string, { category: string; label: string }[]> = {
  Spain: [
    { category: "Legal", label: "Obtain Nota Simple (property registry extract)" },
    { category: "Legal", label: "Verify property has no liens or encumbrances" },
    { category: "Legal", label: "Check urban planning classification (calificación urbanística)" },
    { category: "Legal", label: "Confirm seller ownership and power of attorney" },
    { category: "Legal", label: "Review community rules (estatutos de comunidad)" },
    { category: "Financial", label: "Get NIE (foreigner identification number)" },
    { category: "Financial", label: "Open Spanish bank account" },
    { category: "Financial", label: "Calculate ITP/IVA + AJD taxes (6-10%)" },
    { category: "Financial", label: "Budget notary and registry fees (~1-2%)" },
    { category: "Financial", label: "Request mortgage pre-approval if needed" },
    { category: "Inspection", label: "Commission independent property survey" },
    { category: "Inspection", label: "Check energy performance certificate (CEE)" },
    { category: "Inspection", label: "Verify cédula de habitabilidad" },
    { category: "Inspection", label: "Review ITE (building inspection) status" },
    { category: "Process", label: "Sign arras contract (deposit agreement)" },
    { category: "Process", label: "Sign escritura pública before notary" },
    { category: "Process", label: "Register property at Land Registry" },
    { category: "Process", label: "Set up utility contracts (water, electricity, gas)" },
  ],
  UK: [
    { category: "Legal", label: "Instruct conveyancing solicitor" },
    { category: "Legal", label: "Request property title deeds" },
    { category: "Legal", label: "Check for restrictive covenants" },
    { category: "Legal", label: "Verify planning permissions and building regs" },
    { category: "Legal", label: "Review leasehold terms (if applicable)" },
    { category: "Financial", label: "Get mortgage Agreement in Principle" },
    { category: "Financial", label: "Budget Stamp Duty Land Tax (SDLT)" },
    { category: "Financial", label: "Calculate solicitor and survey fees" },
    { category: "Inspection", label: "Commission RICS Home Survey (Level 2 or 3)" },
    { category: "Inspection", label: "Check EPC energy rating" },
    { category: "Inspection", label: "Review local authority searches" },
    { category: "Inspection", label: "Check flood risk assessment" },
    { category: "Process", label: "Make formal offer to estate agent" },
    { category: "Process", label: "Exchange contracts" },
    { category: "Process", label: "Complete purchase" },
    { category: "Process", label: "Register with HM Land Registry" },
  ],
  US: [
    { category: "Legal", label: "Hire real estate attorney (where required)" },
    { category: "Legal", label: "Review title search and title insurance" },
    { category: "Legal", label: "Check HOA rules and fees (if applicable)" },
    { category: "Legal", label: "Verify property zoning and permits" },
    { category: "Financial", label: "Get mortgage pre-approval letter" },
    { category: "Financial", label: "Review closing cost estimates (2-5%)" },
    { category: "Financial", label: "Budget property taxes and insurance" },
    { category: "Financial", label: "Set up escrow account" },
    { category: "Inspection", label: "Schedule home inspection" },
    { category: "Inspection", label: "Get termite/pest inspection" },
    { category: "Inspection", label: "Request radon test" },
    { category: "Inspection", label: "Check lead paint disclosure (pre-1978)" },
    { category: "Process", label: "Submit purchase offer" },
    { category: "Process", label: "Negotiate contingencies" },
    { category: "Process", label: "Final walkthrough" },
    { category: "Process", label: "Close at title company" },
  ],
  Portugal: [
    { category: "Legal", label: "Obtain Certidão Permanente (property registration)" },
    { category: "Legal", label: "Verify Caderneta Predial (tax registry)" },
    { category: "Legal", label: "Check Licença de Utilização" },
    { category: "Financial", label: "Get NIF (fiscal number)" },
    { category: "Financial", label: "Calculate IMT transfer tax (1-8%)" },
    { category: "Financial", label: "Budget Imposto do Selo (stamp duty 0.8%)" },
    { category: "Inspection", label: "Get energy certificate" },
    { category: "Inspection", label: "Commission independent survey" },
    { category: "Process", label: "Sign CPCV (promissory contract)" },
    { category: "Process", label: "Sign escritura before notary" },
    { category: "Process", label: "Register at Conservatória" },
  ],
  France: [
    { category: "Legal", label: "Review diagnostics package (DDT)" },
    { category: "Legal", label: "Check plan cadastral and servitudes" },
    { category: "Legal", label: "Verify copropriété documents (if apartment)" },
    { category: "Financial", label: "Budget frais de notaire (7-8% old, 2-3% new)" },
    { category: "Financial", label: "Get mortgage offer (offre de prêt)" },
    { category: "Inspection", label: "Review DPE energy rating" },
    { category: "Inspection", label: "Check amiante, plomb, termites reports" },
    { category: "Process", label: "Sign compromis de vente" },
    { category: "Process", label: "Wait 10-day cooling-off period" },
    { category: "Process", label: "Sign acte authentique at notaire" },
  ],
  Germany: [
    { category: "Legal", label: "Review Grundbuch (land register)" },
    { category: "Legal", label: "Check Baulastenverzeichnis (building encumbrances)" },
    { category: "Legal", label: "Verify Teilungserklärung (if apartment)" },
    { category: "Financial", label: "Budget Grunderwerbsteuer (3.5-6.5%)" },
    { category: "Financial", label: "Calculate notary and court fees (~1.5-2%)" },
    { category: "Financial", label: "Get Finanzierungszusage (loan commitment)" },
    { category: "Inspection", label: "Review Energieausweis" },
    { category: "Inspection", label: "Commission Gutachter (surveyor)" },
    { category: "Process", label: "Sign Kaufvertrag before Notar" },
    { category: "Process", label: "Pay Grunderwerbsteuer" },
    { category: "Process", label: "Register Auflassungsvormerkung" },
  ],
};

const GENERAL_TEMPLATE = [
  { category: "Legal", label: "Verify property ownership and title" },
  { category: "Legal", label: "Check for liens, encumbrances, or disputes" },
  { category: "Legal", label: "Review local zoning and building regulations" },
  { category: "Financial", label: "Calculate total acquisition costs (taxes, fees)" },
  { category: "Financial", label: "Get mortgage pre-approval if financing" },
  { category: "Financial", label: "Budget for closing costs and notary fees" },
  { category: "Inspection", label: "Commission independent property survey" },
  { category: "Inspection", label: "Check energy performance certificate" },
  { category: "Inspection", label: "Verify building permits and compliance" },
  { category: "Process", label: "Sign preliminary agreement with deposit" },
  { category: "Process", label: "Complete final contract before notary" },
  { category: "Process", label: "Register property transfer" },
  { category: "Process", label: "Set up utilities and insurance" },
];

function getTemplate(country: string | null): { category: string; label: string }[] {
  if (!country) return GENERAL_TEMPLATE;
  const key = Object.keys(TEMPLATES).find(k => k.toLowerCase() === country.toLowerCase() || country.toLowerCase().includes(k.toLowerCase()));
  return key ? TEMPLATES[key] : GENERAL_TEMPLATE;
}

interface Props {
  analysisId: string;
  country: string | null;
}

export default function DueDiligenceChecklist({ analysisId, country }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const load = async () => {
      const { data } = await supabase
        .from("due_diligence_checklists" as any)
        .select("items")
        .eq("user_id", user.id)
        .eq("analysis_id", analysisId)
        .maybeSingle();

      if (data && Array.isArray((data as any).items) && (data as any).items.length > 0) {
        setItems((data as any).items as ChecklistItem[]);
      } else {
        const template = getTemplate(country);
        const generated = template.map((t, i) => ({
          id: `item-${i}`,
          category: t.category,
          label: t.label,
          completed: false,
        }));
        setItems(generated);
        // Save initial checklist
        await supabase.from("due_diligence_checklists" as any).upsert({
          user_id: user.id,
          analysis_id: analysisId,
          items: generated,
        } as any, { onConflict: "user_id,analysis_id" });
      }
      setLoading(false);
    };
    load();
  }, [user, analysisId, country]);

  const toggleItem = async (id: string) => {
    const updated = items.map(i => i.id === id ? { ...i, completed: !i.completed } : i);
    setItems(updated);
    if (user) {
      await supabase.from("due_diligence_checklists" as any).upsert({
        user_id: user.id,
        analysis_id: analysisId,
        items: updated,
      } as any, { onConflict: "user_id,analysis_id" });
    }
  };

  const completed = items.filter(i => i.completed).length;
  const total = items.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const categories = [...new Set(items.map(i => i.category))];

  if (loading || !user) return null;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between p-5 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <ClipboardList className="h-5 w-5 text-primary" />
          <div className="text-left">
            <h3 className="text-sm font-semibold text-foreground">Due Diligence Checklist</h3>
            <p className="text-xs text-muted-foreground">
              {country || "General"} · {completed}/{total} completed
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-20">
            <Progress value={pct} className="h-1.5" />
          </div>
          <span className={`text-xs font-mono font-semibold ${pct === 100 ? "text-primary" : "text-muted-foreground"}`}>{pct}%</span>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="border-t border-border"
        >
          <div className="p-5 space-y-5">
            {categories.map(cat => (
              <div key={cat}>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{cat}</h4>
                <div className="space-y-1.5">
                  {items.filter(i => i.category === cat).map(item => (
                    <button
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      className="w-full flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-secondary/40 transition-colors text-left group"
                    >
                      {item.completed ? (
                        <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground flex-shrink-0" />
                      )}
                      <span className={`text-xs ${item.completed ? "text-muted-foreground line-through" : "text-foreground"}`}>
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
