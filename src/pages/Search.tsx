import Navbar from "@/components/Navbar";
import PropertyFinder from "@/components/PropertyFinder";
import Footer from "@/components/Footer";
import useDocumentMeta from "@/hooks/useDocumentMeta";

const Search = () => {
  useDocumentMeta({
    title: "Property Search — Find Your Dream Property | RealHunt",
    description: "Search analyzed properties by budget and amenities. Find the perfect investment with AI-powered insights.",
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-16">
        <PropertyFinder />
      </div>
      <Footer />
    </div>
  );
};

export default Search;
