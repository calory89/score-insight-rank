import { useState, useEffect } from "react";
import { Bookmark, Plus, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

export interface DashboardFilter {
  sortBy: "date" | "score";
  favoritesOnly: boolean;
}

interface SavedFilter {
  name: string;
  filter: DashboardFilter;
}

const STORAGE_KEY = "realhunt-saved-filters";

const getSavedFilters = (): SavedFilter[] => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch { return []; }
};

const setSavedFilters = (filters: SavedFilter[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
};

interface SavedFiltersProps {
  currentFilter: DashboardFilter;
  onApply: (filter: DashboardFilter) => void;
}

export const SavedFilters = ({ currentFilter, onApply }: SavedFiltersProps) => {
  const { toast } = useToast();
  const [filters, setFilters] = useState<SavedFilter[]>(getSavedFilters);
  const [open, setOpen] = useState(false);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");

  const saveFilter = () => {
    const n = name.trim();
    if (!n) return;
    const updated = [...filters.filter(f => f.name !== n), { name: n, filter: currentFilter }];
    setFilters(updated);
    setSavedFilters(updated);
    setNaming(false);
    setName("");
    toast({ title: `Filter "${n}" saved` });
  };

  const deleteFilter = (filterName: string) => {
    const updated = filters.filter(f => f.name !== filterName);
    setFilters(updated);
    setSavedFilters(updated);
  };

  const applyFilter = (f: SavedFilter) => {
    onApply(f.filter);
    setOpen(false);
    toast({ title: `Applied "${f.name}"` });
  };

  if (filters.length === 0 && !naming) {
    return (
      <button
        onClick={() => setNaming(true)}
        className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
        title="Save current filter"
      >
        <Bookmark className="h-3 w-3" /> Save View
      </button>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setOpen(!open)}
          className="text-[10px] flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground transition-colors"
        >
          <Bookmark className="h-3 w-3" /> Saved Views
          <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        <button
          onClick={() => setNaming(true)}
          className="text-[10px] p-1.5 rounded-lg border border-dashed border-border text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
          title="Save current view"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute top-full left-0 mt-1 z-20 bg-card border border-border rounded-xl shadow-lg p-2 min-w-[180px]"
          >
            {filters.map(f => (
              <div key={f.name} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary/50 group">
                <button onClick={() => applyFilter(f)} className="text-xs text-foreground flex-1 text-left truncate">
                  {f.name}
                </button>
                <button onClick={() => deleteFilter(f.name)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {naming && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute top-full left-0 mt-1 z-20 bg-card border border-border rounded-xl shadow-lg p-3 min-w-[220px]"
          >
            <p className="text-[10px] text-muted-foreground mb-2">Name this view</p>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && saveFilter()}
              placeholder="e.g. Spain > Score 70+"
              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 mb-2"
            />
            <div className="flex gap-1.5">
              <Button size="sm" className="text-[10px] h-6 px-2" onClick={saveFilter}>Save</Button>
              <Button variant="ghost" size="sm" className="text-[10px] h-6 px-2" onClick={() => { setNaming(false); setName(""); }}>Cancel</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SavedFilters;
