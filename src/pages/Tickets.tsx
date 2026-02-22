import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, Search, Send, ArrowLeft, Clock, CheckCircle2, AlertCircle,
  MessageSquare, X, TicketCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
}

const statusIcon = (s: string) => {
  if (s === "open") return <AlertCircle className="h-3 w-3" />;
  if (s === "in_progress") return <Clock className="h-3 w-3" />;
  return <CheckCircle2 className="h-3 w-3" />;
};

const statusColor = (s: string) => {
  if (s === "open") return "text-score-average bg-score-average/10";
  if (s === "in_progress") return "text-primary bg-primary/10";
  return "text-score-excellent bg-score-excellent/10";
};

const priorityColor = (p: string) => {
  if (p === "high") return "text-destructive bg-destructive/10";
  if (p === "medium") return "text-score-average bg-score-average/10";
  return "text-muted-foreground bg-secondary";
};

const Tickets = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Create ticket form
  const [newSubject, setNewSubject] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [newPriority, setNewPriority] = useState("medium");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/");
  }, [user, authLoading, navigate]);

  const fetchTickets = async () => {
    if (!user) return;
    const { data } = await (supabase
      .from("tickets" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false }) as any);
    setTickets(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTickets();
  }, [user]);

  const fetchMessages = async (ticketId: string) => {
    const { data } = await (supabase
      .from("ticket_messages" as any)
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true }) as any);
    setMessages(data || []);
  };

  const selectTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    fetchMessages(ticket.id);
  };

  const handleCreate = async () => {
    if (!user || !newSubject.trim() || !newDescription.trim()) return;
    setCreating(true);
    const { data: ticket, error } = await (supabase
      .from("tickets" as any)
      .insert({
        user_id: user.id,
        subject: newSubject.trim(),
        category: newCategory,
        priority: newPriority,
      })
      .select()
      .single() as any);

    if (error || !ticket) {
      toast({ title: "Error", description: error?.message || "Could not create ticket", variant: "destructive" });
      setCreating(false);
      return;
    }

    // Add initial message
    await (supabase.from("ticket_messages" as any).insert({
      ticket_id: ticket.id,
      user_id: user.id,
      message: newDescription.trim(),
      is_admin: false,
    }) as any);

    setShowCreate(false);
    setNewSubject("");
    setNewDescription("");
    setNewCategory("general");
    setNewPriority("medium");
    setCreating(false);
    await fetchTickets();
    selectTicket(ticket);
    toast({ title: "Ticket created", description: `Ticket ${ticket.ticket_number} has been submitted.` });
  };

  const handleSendMessage = async () => {
    if (!user || !selectedTicket || !newMessage.trim()) return;
    setSending(true);
    await (supabase.from("ticket_messages" as any).insert({
      ticket_id: selectedTicket.id,
      user_id: user.id,
      message: newMessage.trim(),
      is_admin: false,
    }) as any);
    // Update ticket's updated_at
    await (supabase.from("tickets" as any).update({ updated_at: new Date().toISOString() }).eq("id", selectedTicket.id) as any);
    setNewMessage("");
    setSending(false);
    fetchMessages(selectedTicket.id);
    fetchTickets();
  };

  if (authLoading || !user) return null;

  const filteredTickets = tickets.filter((t) => {
    const matchesSearch = t.subject.toLowerCase().includes(searchQuery.toLowerCase()) || t.ticket_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-20 pb-16 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <TicketCheck className="h-6 w-6 text-primary" /> Support Tickets
            </h1>
            <p className="text-sm text-muted-foreground">Get help from our team.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
            </Button>
            <Button variant="hero" size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-1" /> New Ticket
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 min-h-[600px]">
          {/* Ticket list sidebar */}
          <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
            <div className="p-3 border-b border-border space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tickets…"
                  className="w-full rounded-lg border border-border bg-secondary/50 pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-xs text-foreground"
              >
                <option value="all">All tickets</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[520px]">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="h-5 w-5 rounded-full border-2 border-t-primary border-border animate-spin" />
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <p className="text-xs text-muted-foreground">No tickets found.</p>
                </div>
              ) : (
                filteredTickets.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => selectTicket(t)}
                    className={`w-full text-left px-4 py-3 border-b border-border hover:bg-secondary/30 transition-colors ${
                      selectedTicket?.id === t.id ? "bg-primary/5 border-l-2 border-l-primary" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono text-muted-foreground">{t.ticket_number}</span>
                      <span className={`text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-full flex items-center gap-1 ${statusColor(t.status)}`}>
                        {statusIcon(t.status)} {t.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground truncate">{t.subject}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Updated {new Date(t.updated_at).toLocaleDateString()}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Ticket detail */}
          <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
            {selectedTicket ? (
              <>
                <div className="p-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-foreground">{selectedTicket.subject}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full ${statusColor(selectedTicket.status)}`}>
                          {selectedTicket.status.replace("_", " ")}
                        </span>
                        <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full ${priorityColor(selectedTicket.priority)}`}>
                          {selectedTicket.priority}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{selectedTicket.category}</span>
                        <span className="text-[10px] font-mono text-muted-foreground">{selectedTicket.ticket_number}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[400px]">
                  {messages.map((m) => (
                    <div key={m.id} className={`flex ${m.is_admin ? "justify-start" : "justify-end"}`}>
                      <div className={`max-w-[80%] rounded-xl px-4 py-3 ${
                        m.is_admin
                          ? "bg-secondary text-foreground"
                          : "bg-primary/10 text-foreground"
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-medium uppercase tracking-wider">
                            {m.is_admin ? "Support Team" : "You"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(m.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{m.message}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reply input */}
                {selectedTicket.status !== "closed" && (
                  <div className="p-3 border-t border-border">
                    <div className="flex gap-2">
                      <Textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your reply…"
                        rows={2}
                        className="bg-secondary/50 text-sm flex-1"
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                      />
                      <Button variant="hero" size="sm" onClick={handleSendMessage} disabled={sending || !newMessage.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center p-8">
                <div>
                  <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Select a ticket to view the conversation</p>
                  <p className="text-xs text-muted-foreground mt-1">or create a new one to get help from our team.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Ticket Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-foreground">Create Support Ticket</h3>
                <button onClick={() => setShowCreate(false)} className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-secondary transition-colors">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Subject *</label>
                  <Input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="Brief description of your issue" className="bg-secondary/50" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Category</label>
                    <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)}
                      className="h-10 w-full rounded-md border border-border bg-secondary/50 px-3 text-sm text-foreground">
                      <option value="general">General</option>
                      <option value="billing">Billing</option>
                      <option value="technical">Technical</option>
                      <option value="feature_request">Feature Request</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Priority</label>
                    <select value={newPriority} onChange={(e) => setNewPriority(e.target.value)}
                      className="h-10 w-full rounded-md border border-border bg-secondary/50 px-3 text-sm text-foreground">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Description *</label>
                  <Textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Describe your issue in detail…" rows={4} className="bg-secondary/50" />
                </div>
                <Button variant="hero" className="w-full" onClick={handleCreate} disabled={creating || !newSubject.trim() || !newDescription.trim()}>
                  {creating ? "Creating…" : "Submit Ticket"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Tickets;
