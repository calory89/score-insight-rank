import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { usePageTracking } from "@/hooks/usePageTracking";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Analysis from "./pages/Analysis";
import Compare from "./pages/Compare";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import Rankings from "./pages/Rankings";
import Tickets from "./pages/Tickets";
import Discover from "./pages/Discover";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const PageTracker = ({ children }: { children: React.ReactNode }) => {
  usePageTracking();
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="realhunt-theme">
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <PageTracker>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/analysis/loading" element={<Analysis />} />
                <Route path="/analysis/:id" element={<Analysis />} />
                <Route path="/r/:slug" element={<Analysis />} />
                <Route path="/compare" element={<Compare />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/rankings" element={<Rankings />} />
                <Route path="/tickets" element={<Tickets />} />
                <Route path="/discover" element={<Discover />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/profile/:userId" element={<Profile />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </PageTracker>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
