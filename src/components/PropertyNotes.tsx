import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { StickyNote, X, Plus, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const SUGGESTED_TAGS = ["Visit", "Send to partner", "Overpriced", "Great location", "Needs renovation", "Investment", "Negotiate", "Priority"];

interface PropertyNotesProps {
  analysisId: string;
  compact?: boolean;
}

export const PropertyNotes = ({ analysisId, compact = false }: PropertyNotesProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [note, setNote] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [noteId, setNoteId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    if (!user || !analysisId) return;
    supabase
      .from("property_notes")
      .select("id, note, tags")
      .eq("user_id", user.id)
      .eq("analysis_id", analysisId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setNoteId(data.id);
          setNote(data.note || "");
          setTags(Array.isArray(data.tags) ? (data.tags as string[]) : []);
        }
        setLoaded(true);
      });
  }, [user, analysisId]);

  const save = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    try {
      if (noteId) {
        await supabase.from("property_notes").update({ note, tags }).eq("id", noteId);
      } else {
        const { data } = await supabase.from("property_notes").insert({
          user_id: user.id,
          analysis_id: analysisId,
          note,
          tags,
        }).select("id").single();
        if (data) setNoteId(data.id);
      }
      setEditing(false);
      toast({ title: "Note saved" });
    } catch {
      toast({ title: "Failed to save note", variant: "destructive" });
    }
    setSaving(false);
  }, [user, noteId, note, tags, analysisId, toast]);

  const toggleTag = (tag: string) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
    if (!editing) setEditing(true);
  };

  const addCustomTag = () => {
    const t = newTag.trim();
    if (t && !tags.includes(t)) {
      setTags(prev => [...prev, t]);
      if (!editing) setEditing(true);
    }
    setNewTag("");
  };

  if (!user || !loaded) return null;

  const hasContent = note.trim() || tags.length > 0;

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {tags.slice(0, 2).map(t => (
          <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">{t}</span>
        ))}
        {tags.length > 2 && <span className="text-[9px] text-muted-foreground">+{tags.length - 2}</span>}
        {note && <StickyNote className="h-3 w-3 text-primary/60" />}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold text-foreground">My Notes</h4>
        </div>
        {hasContent && !editing && (
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setEditing(true)}>Edit</Button>
        )}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {(editing ? SUGGESTED_TAGS : tags).map(tag => (
          <button
            key={tag}
            onClick={() => editing && toggleTag(tag)}
            className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
              tags.includes(tag)
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-secondary/50 text-muted-foreground border-border hover:border-primary/20"
            } ${!editing ? "cursor-default" : "cursor-pointer"}`}
          >
            {tags.includes(tag) && "✓ "}{tag}
          </button>
        ))}
        {editing && (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={newTag}
              onChange={e => setNewTag(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addCustomTag()}
              placeholder="Custom tag…"
              className="text-[10px] px-2 py-1 rounded-full border border-dashed border-border bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 w-24"
            />
            {newTag.trim() && (
              <button onClick={addCustomTag} className="text-primary">
                <Plus className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Note text */}
      {editing ? (
        <div className="space-y-2">
          <Textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Add private notes about this property…"
            className="text-sm min-h-[80px] resize-none"
          />
          <div className="flex items-center gap-2">
            <Button size="sm" className="text-xs h-7" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      ) : hasContent ? (
        <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{note || <span className="italic">No notes yet</span>}</p>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="w-full text-left text-xs text-muted-foreground hover:text-foreground py-2 px-3 rounded-lg border border-dashed border-border hover:border-primary/20 transition-colors"
        >
          + Add notes, tags, or reminders about this property…
        </button>
      )}
    </div>
  );
};

// Hook to fetch notes for multiple analyses (for dashboard cards)
export const usePropertyNotes = (analysisIds: string[]) => {
  const { user } = useAuth();
  const [notesMap, setNotesMap] = useState<Record<string, { note: string; tags: string[] }>>({});

  useEffect(() => {
    if (!user || analysisIds.length === 0) return;
    supabase
      .from("property_notes")
      .select("analysis_id, note, tags")
      .eq("user_id", user.id)
      .in("analysis_id", analysisIds)
      .then(({ data }) => {
        if (data) {
          const map: Record<string, { note: string; tags: string[] }> = {};
          data.forEach((n: any) => {
            map[n.analysis_id] = { note: n.note, tags: Array.isArray(n.tags) ? n.tags : [] };
          });
          setNotesMap(map);
        }
      });
  }, [user, analysisIds.join(",")]);

  return notesMap;
};

export default PropertyNotes;
