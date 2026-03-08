import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Search,
  Trophy,
  Gamepad2,
  Settings,
  User,
  GitCompare,
  TicketCheck,
  Home,
  MapPin,
  TrendingUp,
  Compass,
} from "lucide-react";
import { scoreColor } from "@/lib/score-utils";

interface RecentAnalysis {
  id: string;
  address: string | null;
  city: string | null;
  country: string | null;
  global_score: number | null;
}

const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const [recentAnalyses, setRecentAnalyses] = useState<RecentAnalysis[]>([]);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Cmd+K / Ctrl+K listener
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Fetch recent analyses when opened
  useEffect(() => {
    if (!open || !user) return;
    supabase
      .from("analyses")
      .select("id, address, city, country, global_score")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(8)
      .then(({ data }) => {
        if (data) setRecentAnalyses(data);
      });
  }, [open, user]);

  const go = useCallback(
    (path: string) => {
      setOpen(false);
      navigate(path);
    },
    [navigate]
  );

  const pages = [
    { icon: Home, label: "Home", path: "/" },
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: Search, label: "Property Search", path: "/search" },
    { icon: Trophy, label: "Rankings", path: "/rankings" },
    { icon: Gamepad2, label: "Deal or No Deal Game", path: "/game" },
    { icon: GitCompare, label: "Compare Properties", path: "/compare" },
    { icon: Compass, label: "Discover", path: "/discover" },
    { icon: User, label: "My Profile", path: "/profile" },
    { icon: Settings, label: "Settings", path: "/settings" },
    { icon: TicketCheck, label: "Support Tickets", path: "/tickets" },
  ];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search properties, pages, actions..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Pages">
          {pages.map((page) => (
            <CommandItem
              key={page.path}
              onSelect={() => go(page.path)}
              className="gap-3 cursor-pointer"
            >
              <page.icon className="h-4 w-4 text-muted-foreground" />
              <span>{page.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        {user && recentAnalyses.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Recent Analyses">
              {recentAnalyses.map((a) => (
                <CommandItem
                  key={a.id}
                  onSelect={() => go(`/analysis/${a.id}`)}
                  className="gap-3 cursor-pointer"
                >
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="truncate text-sm">
                      {a.address || a.city || "Untitled property"}
                    </span>
                    {a.city && a.country && (
                      <span className="text-xs text-muted-foreground">
                        {a.city}, {a.country}
                      </span>
                    )}
                  </div>
                  {a.global_score != null && (
                    <span
                      className="text-xs font-bold tabular-nums ml-auto"
                      style={{ color: `hsl(var(--${scoreColor(a.global_score)}))` }}
                    >
                      {a.global_score}/100
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Quick Actions">
          <CommandItem
            onSelect={() => go("/dashboard")}
            className="gap-3 cursor-pointer"
          >
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span>New Property Analysis</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};

export default CommandPalette;
