import Navbar from "@/components/Navbar";
import PropertyFinder from "@/components/PropertyFinder";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";
import useDocumentMeta from "@/hooks/useDocumentMeta";

const Search = () => {
  useDocumentMeta({
    title: "Property Search — Find Your Dream Property | RealHunt",
    description: "Search analyzed properties by budget and amenities. Find the perfect investment with AI-powered insights.",
  });

  return (
    <div className="min-h-screen bg-background pb-16 sm:pb-0">
      <Navbar />
      <div className="pt-16">
        <div className="container mx-auto px-4 max-w-5xl pt-8 pb-2">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Property Search</h1>
          <p className="text-sm text-muted-foreground mt-1">Search analyzed properties by budget and amenities.</p>
        </div>
        <PropertyFinder />
      </div>
      <Footer />
      <BottomNav />
    </div>
  );
};

export default Search;
