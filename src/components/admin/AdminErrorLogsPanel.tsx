import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AlertCircle, Loader2, XCircle, Zap, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const AdminErrorLogsPanel = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [retrying, setRetrying] = useState<string | null>(null);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    let query = (supabase.from("error_logs" as any).select("*").order("created_at", { ascending: false }).limit(100) as any);
    if (filterType !== "all") query = query.eq("error_type", filterType);
    const { data } = await query;
    setLogs(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, [filterType]);

  const deleteLog = async (id: string) => {
    await (supabase.from("error_logs" as any).delete().eq("id", id) as any);
    setLogs(prev => prev.filter(l => l.id !== id));
    toast({ title: "Error log deleted" });
  };

  const deleteAll = async () => {
    for (const log of logs) {
      await (supabase.from("error_logs" as any).delete().eq("id", log.id) as any);
    }
    setLogs([]);
    setShowDeleteAllDialog(false);
    toast({ title: "All error logs cleared" });
  };

  const retryAnalysis = async (log: any) => {
    if (!log.url) return;
    setRetrying(log.id);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-property", { body: { url: log.url } });
      if (error) throw error;
      if (data?.scrape_failed || data?.error) throw new Error(data?.error || "Scrape failed");
      await (supabase.from("error_logs" as any).delete().eq("id", log.id) as any);
      setLogs(prev => prev.filter(l => l.id !== log.id));
      toast({ title: "Retry successful!", description: `Score: ${data.data?.global_score || "N/A"}` });
      if (data.data?.id) navigate(`/analysis/${data.data.id}`);
    } catch (e: any) {
      toast({ title: "Retry failed", description: e.message, variant: "destructive" });
    }
    setRetrying(null);
  };

  const errorTypeIcon = (type: string) => {
    switch (type) {
      case "scrape_failed": return "🔍";
      case "rate_limit": return "⏱️";
      case "credits_depleted": return "💳";
      case "ai_error": return "🤖";
      default: return "❌";
    }
  };

  const errorTypeBg = (type: string) => {
    switch (type) {
      case "scrape_failed": return "border-score-average/20 bg-score-average/5";
      case "rate_limit": return "border-primary/20 bg-primary/5";
      case "credits_depleted": return "border-destructive/20 bg-destructive/5";
      case "ai_error": return "border-destructive/20 bg-destructive/5";
      default: return "border-destructive/20 bg-destructive/5";
    }
  };

  const typeCounts = logs.reduce((acc: Record<string, number>, log: any) => {
    acc[log.error_type] = (acc[log.error_type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="rounded-2xl border border-destructive/20 bg-card p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <h2 className="text-base font-semibold text-foreground">Error Logs</h2>
          <span className="text-[10px] text-muted-foreground ml-2">{logs.length} errors</span>
        </div>
        {logs.length > 0 && (
          <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
            <AlertDialogTrigger asChild>
              <button className="text-[10px] text-destructive hover:underline">Clear All</button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete all error logs?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently delete all {logs.length} visible error logs.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={deleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete All</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {["all", "analysis_error", "scrape_failed", "rate_limit", "ai_error", "credits_depleted"].map((type) => (
          <button key={type} onClick={() => setFilterType(type)}
            className={`text-[10px] font-medium uppercase tracking-wider px-2.5 py-1 rounded-full border transition-colors ${
              filterType === type ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/30"
            }`}>
            {type === "all" ? "All" : type.replace(/_/g, " ")}
            {type !== "all" && typeCounts[type] ? ` (${typeCounts[type]})` : ""}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><div className="h-5 w-5 rounded-full border-2 border-t-primary border-border animate-spin" /></div>
      ) : logs.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-8">No errors logged yet. 🎉</p>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {logs.map((log: any) => (
            <div key={log.id} className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 text-xs ${errorTypeBg(log.error_type)}`}>
              <span className="text-sm flex-shrink-0 mt-0.5">{errorTypeIcon(log.error_type)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-medium text-foreground">{log.error_type.replace(/_/g, " ")}</span>
                  <span className="text-[10px] text-muted-foreground">{new Date(log.created_at).toLocaleString()}</span>
                </div>
                <p className="text-muted-foreground truncate">{log.error_message}</p>
                {log.url && <p className="text-primary/70 font-mono truncate mt-0.5">{log.url}</p>}
                {log.user_email && <p className="text-muted-foreground mt-0.5">👤 {log.user_email}</p>}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {log.url && (
                  <button onClick={() => retryAnalysis(log)} disabled={retrying === log.id}
                    className="text-[10px] text-primary hover:underline disabled:opacity-50 flex items-center gap-0.5">
                    {retrying === log.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />} Retry
                  </button>
                )}
                <button onClick={() => deleteLog(log.id)} className="text-[10px] text-destructive hover:underline flex items-center gap-0.5">
                  <XCircle className="h-3 w-3" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminErrorLogsPanel;
