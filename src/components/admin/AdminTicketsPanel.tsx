import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TicketCheck, Send } from "lucide-react";

const AdminTicketsPanel = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("open");
  const { user } = useAuth();

  const fetchTickets = async () => {
    const { data } = await (supabase.from("tickets" as any).select("*").order("updated_at", { ascending: false }) as any);
    setTickets(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchTickets(); }, []);

  const fetchMessages = async (ticketId: string) => {
    const { data } = await (supabase.from("ticket_messages" as any).select("*").eq("ticket_id", ticketId).order("created_at", { ascending: true }) as any);
    setMessages(data || []);
  };

  const selectTicket = (ticket: any) => {
    setSelectedTicket(ticket);
    fetchMessages(ticket.id);
  };

  const handleReply = async () => {
    if (!user || !selectedTicket || !reply.trim()) return;
    setSending(true);
    await (supabase.from("ticket_messages" as any).insert({ ticket_id: selectedTicket.id, user_id: user.id, message: reply.trim(), is_admin: true }) as any);
    await (supabase.from("tickets" as any).update({ updated_at: new Date().toISOString(), status: "in_progress" }).eq("id", selectedTicket.id) as any);
    setReply("");
    setSending(false);
    fetchMessages(selectedTicket.id);
    fetchTickets();
  };

  const closeTicket = async () => {
    if (!selectedTicket) return;
    await (supabase.from("tickets" as any).update({ status: "closed" }).eq("id", selectedTicket.id) as any);
    setSelectedTicket({ ...selectedTicket, status: "closed" });
    fetchTickets();
  };

  const filteredTickets = tickets.filter(t => statusFilter === "all" || t.status === statusFilter);

  return (
    <div className="rounded-2xl border border-border bg-card p-6 mb-8">
      <div className="flex items-center gap-2 mb-4">
        <TicketCheck className="h-5 w-5 text-primary" />
        <h2 className="text-base font-semibold text-foreground">Support Tickets</h2>
        <span className="text-[10px] text-muted-foreground ml-2">{tickets.filter(t => t.status === "open").length} open</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 min-h-[400px]">
        <div className="border border-border rounded-xl overflow-hidden flex flex-col">
          <div className="p-2 border-b border-border">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-border bg-secondary/50 px-2 py-1.5 text-xs text-foreground">
              <option value="all">All</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[350px]">
            {loading ? (
              <div className="flex justify-center py-6"><div className="h-5 w-5 rounded-full border-2 border-t-primary border-border animate-spin" /></div>
            ) : filteredTickets.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No tickets.</p>
            ) : (
              filteredTickets.map((t) => (
                <button key={t.id} onClick={() => selectTicket(t)}
                  className={`w-full text-left px-3 py-2.5 border-b border-border hover:bg-secondary/30 transition-colors ${selectedTicket?.id === t.id ? "bg-primary/5" : ""}`}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-mono text-muted-foreground">{t.ticket_number}</span>
                    <span className={`text-[9px] font-medium uppercase px-1.5 py-0.5 rounded-full ${
                      t.status === "open" ? "text-score-average bg-score-average/10" :
                      t.status === "in_progress" ? "text-primary bg-primary/10" : "text-score-excellent bg-score-excellent/10"
                    }`}>{t.status.replace("_", " ")}</span>
                  </div>
                  <p className="text-xs font-medium text-foreground truncate">{t.subject}</p>
                  <p className="text-[10px] text-muted-foreground">{t.category} · {t.priority}</p>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="border border-border rounded-xl overflow-hidden flex flex-col">
          {selectedTicket ? (
            <>
              <div className="p-3 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{selectedTicket.subject}</h3>
                  <span className="text-[10px] text-muted-foreground">{selectedTicket.ticket_number} · {selectedTicket.category} · {selectedTicket.priority}</span>
                </div>
                {selectedTicket.status !== "closed" && (
                  <Button variant="outline" size="sm" onClick={closeTicket} className="text-xs">Close Ticket</Button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3 max-h-[280px]">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.is_admin ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-xl px-3 py-2 ${m.is_admin ? "bg-primary/10" : "bg-secondary"}`}>
                      <span className="text-[10px] font-medium">{m.is_admin ? "You (Admin)" : "Customer"}</span>
                      <span className="text-[10px] text-muted-foreground ml-2">{new Date(m.created_at).toLocaleString()}</span>
                      <p className="text-xs mt-1 whitespace-pre-wrap">{m.message}</p>
                    </div>
                  </div>
                ))}
              </div>
              {selectedTicket.status !== "closed" && (
                <div className="p-3 border-t border-border flex gap-2">
                  <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply…" rows={2} className="bg-secondary/50 text-xs flex-1"
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleReply(); }}} />
                  <Button variant="hero" size="sm" onClick={handleReply} disabled={sending || !reply.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-xs text-muted-foreground">Select a ticket</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminTicketsPanel;
