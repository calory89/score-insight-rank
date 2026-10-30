import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { GitCompare, Zap, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { scoreColor } from "@/lib/score-utils";

interface BatchJob {
  url: string;
  status: "pending" | "running" | "done" | "error";
  analysisId?: string;
  error?: string;
  score?: number;
}

const AdminBatchPanel = () => {
  const [urlText, setUrlText] = useState("");
  const [jobs, setJobs] = useState<BatchJob[]>([]);
  const [running, setRunning] = useState(false);
  const navigate = useNavigate();

  const startBatch = async () => {
    const urls = urlText
      .split(/[\n,]+/)
      .map(u => u.trim())
      .filter(u => u.length > 5 && (u.startsWith("http://") || u.startsWith("https://")));

    if (urls.length === 0) {
      toast({ title: "No valid URLs", description: "Paste URLs (one per line or comma-separated)", variant: "destructive" });
      return;
    }

    const initialJobs: BatchJob[] = urls.map(url => ({ url, status: "pending" }));
    setJobs(initialJobs);
    setRunning(true);

    for (let i = 0; i < initialJobs.length; i++) {
      setJobs(prev => prev.map((j, idx) => idx === i ? { ...j, status: "running" } : j));
      try {
        const { data, error } = await supabase.functions.invoke("analyze-property", {
          body: { url: initialJobs[i].url },
        });
        if (error) throw error;
        if (data?.scrape_failed) throw new Error("Scrape failed");
        if (data?.error) throw new Error(data.error);
        setJobs(prev => prev.map((j, idx) =>
          idx === i ? { ...j, status: "done", analysisId: data.data?.id, score: data.data?.global_score } : j
        ));
      } catch (e: any) {
        setJobs(prev => prev.map((j, idx) =>
          idx === i ? { ...j, status: "error", error: e.message || "Failed" } : j
        ));
      }
    }
    setRunning(false);
    toast({ title: "Batch complete", description: `${initialJobs.length} URLs processed` });
  };

  const doneCount = jobs.filter(j => j.status === "done").length;
  const errorCount = jobs.filter(j => j.status === "error").length;

  return (
    <div className="rounded-2xl border border-primary/20 bg-card p-6 mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="h-5 w-5 text-primary" />
        <h2 className="text-base font-semibold text-foreground">Batch Analysis</h2>
        <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full font-medium uppercase tracking-wider">Pro</span>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Paste multiple listing URLs below (one per line or comma-separated). All will be analyzed automatically.
      </p>
      <Textarea
        value={urlText}
        onChange={(e) => setUrlText(e.target.value)}
        placeholder={"https://idealista.com/property/12345\nhttps://zillow.com/homedetails/67890\nhttps://rightmove.co.uk/property/11111"}
        rows={5}
        className="bg-secondary/50 text-sm font-mono mb-3"
        disabled={running}
      />
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-muted-foreground">
          {urlText.split(/[\n,]+/).filter(u => u.trim().startsWith("http")).length} URLs detected
        </span>
        <Button variant="hero" size="sm" onClick={startBatch} disabled={running}>
          {running ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Analyzing…</> : <><Zap className="h-3.5 w-3.5 mr-1" /> Analyze All</>}
        </Button>
      </div>

      {jobs.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
            <span>✅ {doneCount} done</span>
            {errorCount > 0 && <span>❌ {errorCount} failed</span>}
            {running && <span className="text-primary">⏳ Processing…</span>}
          </div>
          {jobs.map((job, i) => (
            <div key={i} className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-xs ${
              job.status === "done" ? "border-score-excellent/20 bg-score-excellent/5" :
              job.status === "error" ? "border-destructive/20 bg-destructive/5" :
              job.status === "running" ? "border-primary/20 bg-primary/5" :
              "border-border bg-card"
            }`}>
              {job.status === "running" && <Loader2 className="h-3.5 w-3.5 text-primary animate-spin flex-shrink-0" />}
              {job.status === "done" && <CheckCircle2 className="h-3.5 w-3.5 text-score-excellent flex-shrink-0" />}
              {job.status === "error" && <XCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />}
              {job.status === "pending" && <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />}
              <span className="text-foreground truncate flex-1 font-mono">{job.url}</span>
              {job.score != null && <span className={`font-mono font-bold ${scoreColor(job.score)}`}>{job.score}</span>}
              {job.status === "done" && job.analysisId && (
                <button onClick={() => navigate(`/analysis/${job.analysisId}`)} className="text-primary hover:underline flex-shrink-0">View →</button>
              )}
              {job.status === "error" && <span className="text-destructive truncate max-w-[120px]">{job.error}</span>}
            </div>
          ))}
          {!running && doneCount >= 2 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3">
              <Button variant="hero" size="sm" onClick={() => {
                const ids = jobs.filter(j => j.status === "done" && j.analysisId).map(j => j.analysisId).join(",");
                navigate(`/compare?ids=${ids}`);
              }}>
                <GitCompare className="h-3.5 w-3.5 mr-1" /> Compare {doneCount} Properties
              </Button>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminBatchPanel;
