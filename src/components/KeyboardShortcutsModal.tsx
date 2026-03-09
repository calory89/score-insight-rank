import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

interface Shortcut {
  keys: string[];
  description: string;
}

const shortcuts: Shortcut[] = [
  { keys: ["⌘", "K"], description: "Open command palette" },
  { keys: ["?"], description: "Show keyboard shortcuts" },
  { keys: ["G", "D"], description: "Go to Dashboard" },
  { keys: ["G", "H"], description: "Go to Home" },
  { keys: ["Esc"], description: "Close dialogs & modals" },
];

const KeyboardShortcutsModal = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let lastKey = "";
    let lastKeyTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return;
      }

      // ? key to show shortcuts
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setOpen(true);
      }

      // G+D for dashboard, G+H for home (within 500ms)
      const now = Date.now();
      if (e.key.toLowerCase() === "g") {
        lastKey = "g";
        lastKeyTime = now;
      } else if (lastKey === "g" && now - lastKeyTime < 500) {
        if (e.key.toLowerCase() === "d") {
          e.preventDefault();
          window.location.href = "/dashboard";
        } else if (e.key.toLowerCase() === "h") {
          e.preventDefault();
          window.location.href = "/";
        }
        lastKey = "";
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          {shortcuts.map((shortcut, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{shortcut.description}</span>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, j) => (
                  <kbd
                    key={j}
                    className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-[11px] font-medium bg-secondary text-secondary-foreground rounded border border-border shadow-sm"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center pt-4 border-t border-border mt-4">
          Press <kbd className="px-1 py-0.5 bg-secondary rounded text-[10px]">Esc</kbd> to close
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default KeyboardShortcutsModal;
