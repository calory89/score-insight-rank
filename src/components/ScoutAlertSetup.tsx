import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Radar, Bell, Plus, X, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ScoutCriteria {
  city?: string;
  country?: string;
  min_score?: number;
  min_price?: number;
  max_price?: number;
}

interface ScoutAlert {
  id: string;
  criteria: ScoutCriteria;
  active: boolean;
  created_at: string;
}

export default function ScoutAlertSetup() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<ScoutAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [minScore, setMinScore] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("scout_alerts" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setAlerts((data as any[] || []) as ScoutAlert[]);
      setLoading(false);
    };
    load();
  }, [user]);

  const handleCreate = async () => {
    if (!user) return;
    const criteria: ScoutCriteria = {};
    if (city.trim()) criteria.city = city.trim();
    if (country.trim()) criteria.country = country.trim();
    if (minScore) criteria.min_score = parseInt(minScore);
    if (maxPrice) criteria.max_price = parseInt(maxPrice.replace(/[^0-9]/g, ""));

    if (Object.keys(criteria).length === 0) {
      toast.error("Please set at least one criterion");
      return;
    }

    const { data, error } = await supabase
      .from("scout_alerts" as any)
      .insert({ user_id: user.id, criteria, active: true } as any)
      .select()
      .single();

    if (error) { toast.error("Failed to create alert"); return; }
    setAlerts(prev => [data as any as ScoutAlert, ...prev]);
    setShowForm(false);
    setCity(""); setCountry(""); setMinScore(""); setMaxPrice("");
    toast.success("Scout alert created! You'll be notified when matching properties appear.");
  };

  const toggleAlert = async (id: string, active: boolean) => {
    await supabase.from("scout_alerts" as any).update({ active: !active } as any).eq("id", id);
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, active: !active } : a));
  };

  const deleteAlert = async (id: string) => {
    await supabase.from("scout_alerts" as any).delete().eq("id", id);
    setAlerts(prev => prev.filter(a => a.id !== id));
    toast.success("Alert deleted");
  };

  if (!user) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Radar className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Property Scout</h3>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowForm(f => !f)} className="text-xs h-7">
          <Plus className="h-3 w-3 mr-1" /> New Alert
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Get notified when someone analyzes a property matching your criteria.
      </p>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">City</label>
                  <Input value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Malaga" className="h-8 text-xs" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Country</label>
                  <Input value={country} onChange={e => setCountry(e.target.value)} placeholder="e.g. Spain" className="h-8 text-xs" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Min Score</label>
                  <Input type="number" value={minScore} onChange={e => setMinScore(e.target.value)} placeholder="e.g. 70" className="h-8 text-xs" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Max Price</label>
                  <Input value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="e.g. 300000" className="h-8 text-xs" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="hero" size="sm" onClick={handleCreate} className="text-xs h-7">
                  <Bell className="h-3 w-3 mr-1" /> Create Alert
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowForm(false)} className="text-xs h-7">Cancel</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map(i => <div key={i} className="h-12 rounded-lg bg-secondary animate-pulse" />)}
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-6">
          <Radar className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No alerts yet. Create one to get notified.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map(alert => (
            <div key={alert.id} className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${alert.active ? "border-primary/20 bg-primary/5" : "border-border bg-secondary/30 opacity-60"}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  {alert.criteria.city && <span className="px-1.5 py-0.5 rounded bg-secondary text-foreground">{alert.criteria.city}</span>}
                  {alert.criteria.country && <span className="px-1.5 py-0.5 rounded bg-secondary text-foreground">{alert.criteria.country}</span>}
                  {alert.criteria.min_score && <span className="px-1.5 py-0.5 rounded bg-secondary text-foreground">Score ≥{alert.criteria.min_score}</span>}
                  {alert.criteria.max_price && <span className="px-1.5 py-0.5 rounded bg-secondary text-foreground">≤€{alert.criteria.max_price.toLocaleString()}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1.5 ml-3">
                <button onClick={() => toggleAlert(alert.id, alert.active)} className="text-muted-foreground hover:text-foreground transition-colors">
                  {alert.active ? <ToggleRight className="h-5 w-5 text-primary" /> : <ToggleLeft className="h-5 w-5" />}
                </button>
                <button onClick={() => deleteAlert(alert.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
