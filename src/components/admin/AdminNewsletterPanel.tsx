import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Newspaper, Download } from "lucide-react";

const AdminNewsletterPanel = () => {
  const [subscribers, setSubscribers] = useState<{ id: string; email: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("newsletter_subscribers").select("*").order("created_at", { ascending: false });
      setSubscribers((data as any[]) || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const exportCsv = () => {
    const csv = "email,subscribed_at\n" + subscribers.map(s => `${s.email},${s.created_at}`).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Newsletter Subscribers</h2>
          <span className="text-[10px] text-muted-foreground ml-2">{subscribers.length} total</span>
        </div>
        {subscribers.length > 0 && (
          <button onClick={exportCsv} className="flex items-center gap-1 text-xs text-primary hover:underline">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        )}
      </div>
      {loading ? (
        <div className="flex justify-center py-6"><div className="h-5 w-5 rounded-full border-2 border-t-primary border-border animate-spin" /></div>
      ) : subscribers.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">No subscribers yet.</p>
      ) : (
        <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
          {subscribers.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-xs">
              <span className="text-foreground font-medium">{s.email}</span>
              <span className="text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminNewsletterPanel;
