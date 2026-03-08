import { useState, useEffect } from "react";
import { ADMIN_EMAIL } from "@/lib/constants";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion, LayoutGroup } from "framer-motion";
import { Menu, X, LogOut, LayoutDashboard, Settings, Sun, Moon, TicketCheck, ChevronDown, User } from "lucide-react";
import NotificationsBell from "@/components/NotificationsBell";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useTheme } from "next-themes";
import LoginGateModal from "@/components/LoginGateModal";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [scrolledPastHero, setScrolledPastHero] = useState(false);
  const { user, signOut } = useAuth();
  const { creditsUsed, creditsTotal, plan } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();

  const isActive = (path: string) => location.pathname === path;

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  useEffect(() => {
    const handleScroll = () => {
      setScrolledPastHero(window.scrollY > 500);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const userInitial = user?.email?.charAt(0).toUpperCase() || "U";

  return (
    <>
      <motion.nav
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/90 backdrop-blur-xl"
      >
        <LayoutGroup>
        <div className="container mx-auto flex h-14 sm:h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => { navigate("/"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
            <img src="/images/logo.png" alt="RealHunt" className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg object-cover" />
            <span className="text-base sm:text-lg font-semibold text-foreground">RealHunt</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {[
              { href: "/#how-it-works", label: "How It Works", path: null },
              { href: "/game", label: "Game", path: "/game" },
              { href: "/rankings", label: "Rankings", path: "/rankings" },
              ...(user?.email === ADMIN_EMAIL ? [{ href: "/leads", label: "Leads", path: "/leads" }] : []),
              { href: "/search", label: "Search", path: "/search" },
              { href: "/#pricing", label: "Pricing", path: null },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`relative text-sm transition-colors py-1 ${link.path && isActive(link.path) ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
                onClick={link.path ? (e) => { e.preventDefault(); navigate(link.path!); } : undefined}
              >
                {link.label}
                {link.path && isActive(link.path) && (
                  <motion.span
                    layoutId="nav-indicator"
                    className="absolute -bottom-[17px] left-0 right-0 h-[2px] bg-primary rounded-full"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2">
            <button onClick={toggleTheme} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title="Toggle theme">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {user && <NotificationsBell />}
            {user ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="text-xs gap-1">
                  <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
                </Button>
                {plan && (
                  <Badge
                    variant="secondary"
                    className={`text-[10px] cursor-pointer transition-all ${
                      plan === "free" && creditsTotal - creditsUsed <= 2
                        ? "animate-pulse border-destructive/50 bg-destructive/10 text-destructive"
                        : ""
                    }`}
                    onClick={() => { if (plan === "free") { const el = document.getElementById("pricing"); if (el) el.scrollIntoView({ behavior: "smooth" }); } }}
                  >
                    {creditsTotal - creditsUsed}/{creditsTotal} {plan}
                  </Badge>
                )}
                {/* Profile dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-secondary transition-colors">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
                          {userInitial}
                        </AvatarFallback>
                      </Avatar>
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <div className="px-3 py-2">
                      <p className="text-xs font-medium text-foreground truncate">{user.email}</p>
                      {plan && <p className="text-[10px] text-muted-foreground capitalize mt-0.5">{plan} plan</p>}
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/profile")} className="text-xs gap-2 cursor-pointer">
                      <User className="h-3.5 w-3.5" /> Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/settings")} className="text-xs gap-2 cursor-pointer">
                      <Settings className="h-3.5 w-3.5" /> Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/tickets")} className="text-xs gap-2 cursor-pointer">
                      <TicketCheck className="h-3.5 w-3.5" /> Support
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut} className="text-xs gap-2 cursor-pointer text-muted-foreground">
                      <LogOut className="h-3.5 w-3.5" /> Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => setShowLogin(true)}>Log in</Button>
                <Button
                  variant="hero"
                  size="sm"
                  onClick={() => setShowLogin(true)}
                  className={`transition-all duration-500 ${scrolledPastHero ? "shadow-[0_0_20px_hsl(var(--primary)/0.4)] scale-105" : ""}`}
                >
                  Get Started
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <button onClick={toggleTheme} className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {user && <NotificationsBell />}
            <button className="text-foreground p-1" onClick={() => setIsOpen(!isOpen)}>
              {isOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        </LayoutGroup>

        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="md:hidden border-t border-border bg-background px-4 py-4 space-y-3"
          >
            <a href="/#how-it-works" className="block text-sm text-muted-foreground py-2" onClick={() => setIsOpen(false)}>How It Works</a>
            <a href="/game" className="block text-sm text-muted-foreground py-2" onClick={(e) => { e.preventDefault(); navigate("/game"); setIsOpen(false); }}>Game</a>
            <a href="/rankings" className="block text-sm text-muted-foreground py-2" onClick={(e) => { e.preventDefault(); navigate("/rankings"); setIsOpen(false); }}>Rankings</a>
            {user?.email === ADMIN_EMAIL && <a href="/leads" className="block text-sm text-muted-foreground py-2" onClick={(e) => { e.preventDefault(); navigate("/leads"); setIsOpen(false); }}>Leads</a>}
            <a href="/search" className="block text-sm text-muted-foreground py-2" onClick={(e) => { e.preventDefault(); navigate("/search"); setIsOpen(false); }}>Search</a>
            <a href="/#pricing" className="block text-sm text-muted-foreground py-2" onClick={() => setIsOpen(false)}>Pricing</a>
            <div className="border-t border-border my-2" />
            {user ? (
              <div className="space-y-1">
                {plan && (
                  <div className="flex items-center justify-between px-1 py-2">
                    <span className="text-xs text-muted-foreground">Credits</span>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] ${
                        plan === "free" && creditsTotal - creditsUsed <= 2
                          ? "animate-pulse border-destructive/50 bg-destructive/10 text-destructive"
                          : ""
                      }`}
                    >
                      {creditsTotal - creditsUsed}/{creditsTotal} {plan}
                    </Badge>
                  </div>
                )}
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={() => { navigate("/dashboard"); setIsOpen(false); }}>
                  <LayoutDashboard className="h-4 w-4" /> Dashboard
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={() => { navigate("/profile"); setIsOpen(false); }}>
                  <User className="h-4 w-4" /> Profile
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={() => { navigate("/tickets"); setIsOpen(false); }}>
                  <TicketCheck className="h-4 w-4" /> Support
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={() => { navigate("/settings"); setIsOpen(false); }}>
                  <Settings className="h-4 w-4" /> Settings
                </Button>
                <div className="border-t border-border my-1" />
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground" onClick={signOut}>
                  <LogOut className="h-4 w-4" /> Sign Out
                </Button>
              </div>
            ) : (
              <Button variant="hero" size="sm" className="w-full mt-2" onClick={() => { setShowLogin(true); setIsOpen(false); }}>Get Started</Button>
            )}
          </motion.div>
        )}
      </motion.nav>
      <LoginGateModal open={showLogin} onClose={() => setShowLogin(false)} />
    </>
  );
};

export default Navbar;
