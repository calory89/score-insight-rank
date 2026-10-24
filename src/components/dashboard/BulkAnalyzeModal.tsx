import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Crown, Layers, X, Lock, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { scoreColor, verdictColorSimple as verdictColor } from "@/lib/score-utils";

const bulkSteps = [
  { text: "Accessing listing page…", sub: "Extracting real property data" },
  { text: "Reading price, size & features…", sub: "Parsing listing content" },
  { text: "Analyzing market signals…", sub: "Comparing 450+ listings in the area" },
  { text: "Running neighborhood intelligence…", sub: "Walk score, transit, safety analysis" },
  { text: "Computing financial models…", sub: "Mortgage scenarios, IRR, break-even" },
  { text: "Building comparable database…", sub: "Finding similar sales & rentals" },
  { text: "Calculating risk exposure…", sub: "Stress tests & exit strategy" },
  { text: "Generating forensic report…", sub: "Final score calibration" },
];

interface BulkAnalyzeModalProps {
  open: boolean;
  onClose: () => void;
  isPro: boolean;
  onUpgrade: () => void;
  user: any;
}

const BulkAnalyzeModal = ({ open, onClose, isPro, onUpgrade, user }: BulkAnalyzeModalProps) => {
  const navigate = useNavigate();
  const [urls, setUrls] = useState("");
  const [bulkResults, setBulkResults] = useState<any[]>(() => {
    try {
      const stored = sessionStorage.getItem("bulkResults");
      if (stored) {
        sessionStorage.removeItem("bulkResults");
        return JSON.parse(stored);
      }
    } catch {}
    return [];
  });
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkTotal, setBulkTotal] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentUrl, setCurrentUrl] = useState("");
  const { toast } = useToast();

  if (!open) return null;

  const parseUrls = (text: string): string[] => {
    return text
      .split(/[\n\r,\t ]+/)
      .map(l => l.trim())
      .filter(l => l.length > 8 && (l.startsWith("http") || l.includes(".")));
  };

  const detectedUrls = parseUrls(urls);

  const handleBulk = async () => {
    if (!isPro) { onUpgrade(); return; }
    if (detectedUrls.length === 0) return;

    setBulkRunning(true);
    setBulkResults([]);
    setBulkProgress(0);
    setBulkTotal(detectedUrls.length);
    setCurrentStep(0);

    const results: any[] = [];
    for (let i = 0; i < detectedUrls.length; i++) {
      setBulkProgress(i + 1);
      setCurrentUrl(detectedUrls[i]);
      setCurrentStep(0);

      const stepInterval = setInterval(() => {
        setCurrentStep(prev => Math.min(prev + 1, bulkSteps.length - 1));
      }, 3000);

      try {
        const { data: result, error } = await supabase.functions.invoke("analyze-property", {
          body: { url: detectedUrls[i] },
        });
        clearInterval(stepInterval);
        if (error) throw error;
        if (result?.data) results.push(result.data);
      } catch (e: any) {
        clearInterval(stepInterval);
        results.push({ url: detectedUrls[i], error: true, address: detectedUrls[i] });
      }
      setBulkResults([...results]);
    }

    setBulkRunning(false);
    toast({ title: `✅ ${results.filter(r => !r.error).length} of ${detectedUrls.length} analyzed successfully` });
  };

  const rawPercent = bulkTotal > 0 ? Math.round(((bulkProgress - 1 + (currentStep + 1) / bulkSteps.length) / bulkTotal) * 100) : 0;
  const overallPercent = bulkRunning ? Math.min(rawPercent, 99) : (bulkResults.length > 0 ? 100 : 0);

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={bulkRunning ? undefined : onClose}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg rounded-2xl border border-primary/30 bg-card p-6 shadow-xl max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold text-foreground">Bulk Analyze</h3>
            </div>
            {!bulkRunning && <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>}
          </div>

          {bulkRunning ? (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Overall Progress</span>
                  <span className="text-sm font-mono font-bold text-primary">{overallPercent}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                  <motion.div className="h-full rounded-full bg-gradient-cta" animate={{ width: `${overallPercent}%` }} transition={{ duration: 0.5, ease: "easeOut" }} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">Property {bulkProgress} of {bulkTotal}</p>
              </div>

              <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
                <div className="flex flex-col items-center text-center">
                  <div className="relative mx-auto mb-4 h-12 w-12">
                    <div className="absolute inset-0 rounded-full border-2 border-border" />
                    <div className="absolute inset-0 rounded-full border-2 border-t-primary animate-spin" style={{ animationDuration: "1.5s" }} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    </div>
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.div key={currentStep} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
                      <p className="text-sm font-semibold text-foreground mb-0.5">{bulkSteps[currentStep]?.text}</p>
                      <p className="text-[10px] text-muted-foreground">{bulkSteps[currentStep]?.sub}</p>
                    </motion.div>
                  </AnimatePresence>
                  <p className="text-[10px] text-muted-foreground mt-3 truncate max-w-[280px]">{currentUrl}</p>
                  <div className="flex items-center gap-1 mt-3">
                    {bulkSteps.map((_, idx) => (
                      <div key={idx} className={`h-1 rounded-full transition-all duration-500 ${idx <= currentStep ? "w-4 bg-primary" : "w-2 bg-border"}`} />
                    ))}
                  </div>
                </div>
              </div>

              {bulkResults.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">✅ Completed ({bulkResults.length})</p>
                  <div className="grid grid-cols-2 gap-2">
                    {bulkResults.map((r, i) => (
                      <div key={i} className={`rounded-lg border p-2.5 text-xs ${r.error ? "border-destructive/20 bg-destructive/5" : "border-border bg-secondary/30"}`}>
                        {r.error ? (
                          <span className="text-destructive">Failed</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className={`font-mono font-bold ${scoreColor(r.global_score || 0)}`}>{r.global_score}</span>
                            <span className="text-muted-foreground truncate">{r.address || r.city || "Property"}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : bulkResults.length > 0 ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {bulkResults.map((r, i) => (
                  <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    onClick={() => {
                      if (r.id && !r.error) {
                        sessionStorage.setItem("bulkResults", JSON.stringify(bulkResults));
                        onClose();
                        navigate(`/analysis/${r.id}?from=bulk`);
                      }
                    }}
                    className={`rounded-xl border p-4 transition-all ${r.error ? "border-destructive/30 bg-destructive/5 cursor-default" : "border-border bg-card hover:border-primary/30 cursor-pointer group"}`}>
                    {r.error ? (
                      <div>
                        <p className="text-xs text-destructive font-medium mb-1">Failed</p>
                        <p className="text-[10px] text-muted-foreground truncate">{r.address}</p>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-2xl font-bold font-mono ${scoreColor(r.global_score || 0)}`}>{r.global_score || "—"}</span>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${verdictColor(r.verdict || "")}`}>{r.verdict || "—"}</span>
                        </div>
                        <p className="text-xs font-medium text-foreground truncate">{r.address || r.city || "Property"}</p>
                        <p className="text-[10px] text-muted-foreground">{r.city}{r.city && r.country ? ", " : ""}{r.country}</p>
                        {r.price && <p className="text-xs font-mono text-foreground mt-1">{r.price}</p>}
                        <p className="text-[10px] text-primary mt-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          View full report <ArrowRight className="h-2.5 w-2.5" />
                        </p>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
              <Button variant="ghost" size="sm" className="w-full mt-2" onClick={() => { setBulkResults([]); setUrls(""); }}>
                Analyze More
              </Button>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                Paste multiple property URLs, separated by new lines, spaces, or commas.
              </p>
              {!isPro && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 mb-4 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary flex-shrink-0" />
                  <p className="text-xs text-primary">Bulk Analyze is a <strong>Pro feature</strong>. Upgrade to analyze multiple properties at once.</p>
                </div>
              )}
              <Textarea
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
                placeholder={"https://www.zillow.com/homedetails/...\nhttps://www.rightmove.co.uk/properties/...\nhttps://www.redfin.com/...\nhttps://www.airbnb.com/rooms/...\n\nPaste as many URLs as you want, one per line, separated by spaces or commas."}
                className={`text-sm font-mono mb-4 transition-all duration-300 ${detectedUrls.length > 0 ? "min-h-[220px]" : "min-h-[160px]"}`}
                disabled={!isPro}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {detectedUrls.length} URL{detectedUrls.length !== 1 ? "s" : ""} detected
                </span>
                <Button variant="hero" size="sm" onClick={handleBulk} disabled={bulkRunning}>
                  {isPro ? (
                    <>Analyze All ({detectedUrls.length}) <ArrowRight className="ml-1 h-3.5 w-3.5" /></>
                  ) : (
                    <>Upgrade to Pro <Crown className="ml-1 h-3.5 w-3.5" /></>
                  )}
                </Button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default BulkAnalyzeModal;
