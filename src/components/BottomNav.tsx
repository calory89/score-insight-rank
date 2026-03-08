import { useNavigate, useLocation } from "react-router-dom";
import { Search, Compass, Trophy, User, Flame } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const tabs = [
  { id: "score", label: "Score", icon: Search, path: "/dashboard" },
  { id: "game", label: "Game", icon: Flame, path: "/game" },
  { id: "discover", label: "Discover", icon: Compass, path: "/discover" },
  { id: "rankings", label: "Rankings", icon: Trophy, path: "/rankings" },
  { id: "profile", label: "Profile", icon: User, path: "/profile" },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  if (!user) return null;

  const currentTab = tabs.find((t) => location.pathname.startsWith(t.path))?.id || "score";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-xl sm:hidden">
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors relative ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <tab.icon className={`h-5 w-5 ${isActive ? "text-primary" : ""}`} />
              <span className="text-[10px] font-medium">{tab.label}</span>
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
