import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";

const StickyMobileCTA = () => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 600);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Hide for authenticated users (BottomNav handles navigation)
  if (!isMobile || !visible || user) return null;

  const scrollToHero = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 bg-background/80 backdrop-blur-lg border-t border-border">
      <Button
        variant="hero"
        className="w-full h-12 text-sm rounded-xl"
        onClick={scrollToHero}
      >
        <Search className="w-4 h-4 mr-2" />
        Analyze a Property
      </Button>
    </div>
  );
};

export default StickyMobileCTA;
