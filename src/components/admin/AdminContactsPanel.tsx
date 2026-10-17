import { csvRow } from "@/lib/csv";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Phone, Download } from "lucide-react";

const AdminContactsPanel = () => {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("contact_requests").select("*").order("created_at", { ascending: false });
      setContacts((data as any[]) || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const exportCsv = () => {
    const csv = "email,company,phone,message,source,estimated_searches,created_at\n" +
      contacts.map(c => csvRow([c.email, c.company, c.phone, c.message, c.source, c.estimated_searches, c.created_at])).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `contact-requests-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Phone className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Contact Requests</h2>
          <span className="text-[10px] text-muted-foreground ml-2">{contacts.length} total</span>
        </div>
        {contacts.length > 0 && (
          <button onClick={exportCsv} className="flex items-center gap-1 text-xs text-primary hover:underline">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        )}
      </div>
      {loading ? (
        <div className="flex justify-center py-6"><div className="h-5 w-5 rounded-full border-2 border-t-primary border-border animate-spin" /></div>
      ) : contacts.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">No contact requests yet.</p>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {contacts.map((c) => (
            <div key={c.id} className="rounded-lg border border-border px-4 py-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{c.email}</span>
                  {c.company && <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{c.company}</span>}
                </div>
                <span className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-1">
                <span className="uppercase tracking-wider font-medium text-primary/70">{c.source}</span>
                {c.phone && <span>📞 {c.phone}</span>}
                {c.estimated_searches && <span>~{c.estimated_searches} searches</span>}
              </div>
              {c.message && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{c.message}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminContactsPanel;
