import { useNavigate, useLocation } from "react-router-dom";
import { Search, Compass, Trophy, User, Flame } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";

const tabs = [
  { id: "score", label: "Score", icon: Search, path: "/dashboard" },
  { id: "game", label: "Game", icon: Flame, path: "/game" },
  { id: "discover", label: "Discover", icon: Compass, path: "/discover" },
  { id: "rankings", label: "Rankings", icon: Trophy, path: "/rankings" },
  { id: "profile", label: "Profile", icon: User, path: "/profile" },
];

const searchPaths = ["/search", "/dashboard"];

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  if (!user) return null;

  const currentTab = tabs.find((t) => location.pathname.startsWith(t.path))?.id || (searchPaths.some(p => location.pathname.startsWith(p)) ? "score" : "");

  return (
    <nav
      role="navigation"
      aria-label="Mobile navigation"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-background/95 backdrop-blur-xl sm:hidden pb-safe"
    >
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-all duration-200 relative ${
                isActive ? "text-primary" : "text-muted-foreground active:text-foreground"
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="bottom-nav-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <motion.div
                animate={{ scale: isActive ? 1.1 : 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <tab.icon
                  className={`transition-all duration-200 ${isActive ? "h-[22px] w-[22px] text-primary" : "h-5 w-5"}`}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  fill={isActive ? "currentColor" : "none"}
                />
              </motion.div>
              <span className={`text-[10px] transition-all ${isActive ? "font-semibold" : "font-medium"}`}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
