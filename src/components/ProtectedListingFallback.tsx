import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Shield, PenLine, Upload, Globe, ArrowRight, X, Building2, ChevronDown,
} from "lucide-react";

interface ManualEntryData {
  city: string;
  price: string;
  size: string;
  sizeUnit: "sqm" | "sqft";
  bedrooms: string;
  propertyType: string;
  strategy: string;
  listingUrl: string;
}

interface ProtectedListingFallbackProps {
  url: string;
  onManualEntry: (data: ManualEntryData) => void;
  onPasteContent: (content: string) => void;
  onUploadFiles: (files: File[]) => void;
  submitting?: boolean;
}

const propertyTypes = ["Apartment", "House", "Villa", "Studio", "Penthouse", "Townhouse", "Land", "Commercial"];
const strategies = ["Long-term Rental", "Short-term / Airbnb", "Flip / Renovation", "Buy & Hold", "Development"];

const ProtectedListingFallback = ({
  url,
  onManualEntry,
  onPasteContent,
  onUploadFiles,
  submitting,
}: ProtectedListingFallbackProps) => {
  const [activeOption, setActiveOption] = useState<"manual" | "paste" | "upload" | "extension" | null>(null);
  const [manualData, setManualData] = useState<ManualEntryData>({
    city: "", price: "", size: "", sizeUnit: "sqm", bedrooms: "", propertyType: "", strategy: "", listingUrl: url,
  });
  const [pasteContent, setPasteContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []).slice(0, 5);
    setFiles(selected);
  };

  const canSubmitManual = manualData.city.trim() && manualData.price.trim();
  const canSubmitPaste = pasteContent.trim().length >= 30;
  const canSubmitUpload = files.length > 0;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
          <Shield className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">
          This listing is protected.
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
          We can't access the page automatically.<br />
          Choose one option to continue your analysis.
        </p>
      </motion.div>

      {/* Options */}
      <div className="space-y-3">
        {/* Option 1: Manual Entry */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <button
            onClick={() => setActiveOption(activeOption === "manual" ? null : "manual")}
            className={`w-full rounded-xl border p-5 text-left transition-all ${
              activeOption === "manual"
                ? "border-primary/40 bg-primary/5"
                : "border-border bg-card hover:border-primary/20"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <PenLine className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-foreground">Enter Property Details</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Quick form — takes about 30 seconds</p>
              </div>
              <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Recommended
              </span>
            </div>
          </button>

          <AnimatePresence>
            {activeOption === "manual" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-xl border border-border bg-card p-5 mt-2 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5 block">City / Neighborhood *</label>
                      <input
                        value={manualData.city}
                        onChange={(e) => setManualData({ ...manualData, city: e.target.value })}
                        placeholder="e.g. Madrid, Salamanca"
                        className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5 block">Asking Price *</label>
                      <input
                        value={manualData.price}
                        onChange={(e) => setManualData({ ...manualData, price: e.target.value })}
                        placeholder="e.g. €350,000"
                        className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5 block">Size</label>
                      <div className="flex gap-2">
                        <input
                          value={manualData.size}
                          onChange={(e) => setManualData({ ...manualData, size: e.target.value })}
                          placeholder="120"
                          className="flex-1 rounded-lg border border-border bg-secondary/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
                        />
                        <select
                          value={manualData.sizeUnit}
                          onChange={(e) => setManualData({ ...manualData, sizeUnit: e.target.value as "sqm" | "sqft" })}
                          className="rounded-lg border border-border bg-secondary/50 px-2 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/40"
                        >
                          <option value="sqm">m²</option>
                          <option value="sqft">ft²</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5 block">Bedrooms</label>
                      <input
                        value={manualData.bedrooms}
                        onChange={(e) => setManualData({ ...manualData, bedrooms: e.target.value })}
                        placeholder="3"
                        type="number"
                        className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5 block">Property Type</label>
                      <select
                        value={manualData.propertyType}
                        onChange={(e) => setManualData({ ...manualData, propertyType: e.target.value })}
                        className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/40"
                      >
                        <option value="">Select…</option>
                        {propertyTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5 block">Investment Strategy</label>
                      <select
                        value={manualData.strategy}
                        onChange={(e) => setManualData({ ...manualData, strategy: e.target.value })}
                        className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/40"
                      >
                        <option value="">Select…</option>
                        {strategies.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <Button
                    variant="hero"
                    className="w-full"
                    disabled={!canSubmitManual || submitting}
                    onClick={() => onManualEntry(manualData)}
                  >
                    {submitting ? "Analyzing…" : "Generate Analysis"} <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                  <p className="text-[10px] text-muted-foreground text-center">
                    Analysis based on market data, area averages, and comparable performance.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Option 2: Paste Content */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <button
            onClick={() => setActiveOption(activeOption === "paste" ? null : "paste")}
            className={`w-full rounded-xl border p-5 text-left transition-all ${
              activeOption === "paste"
                ? "border-primary/40 bg-primary/5"
                : "border-border bg-card hover:border-primary/20"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-accent/30 flex items-center justify-center flex-shrink-0">
                <Upload className="h-5 w-5 text-accent-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-foreground">Paste Listing Content</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Copy all text from the listing page and paste it here</p>
              </div>
            </div>
          </button>

          <AnimatePresence>
            {activeOption === "paste" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-xl border border-border bg-card p-5 mt-2 space-y-4">
                  <textarea
                    value={pasteContent}
                    onChange={(e) => setPasteContent(e.target.value)}
                    placeholder={"Paste all the listing information here…\n\nFor example:\n• Price: €350,000\n• Location: Madrid, Spain\n• 3 bedrooms, 2 bathrooms\n• 120 m²\n• Year built: 1985\n• Description, features, amenities…"}
                    className="w-full h-48 rounded-xl border border-border bg-secondary/50 p-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 resize-none"
                  />
                  <Button
                    variant="hero"
                    className="w-full"
                    disabled={!canSubmitPaste || submitting}
                    onClick={() => onPasteContent(pasteContent)}
                  >
                    {submitting ? "Analyzing…" : "Analyze from Content"} <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                  <p className="text-[10px] text-muted-foreground text-center">
                    We'll extract price, location, size, and all details automatically.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Option 3: Upload Screenshots */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <button
            onClick={() => setActiveOption(activeOption === "upload" ? null : "upload")}
            className={`w-full rounded-xl border p-5 text-left transition-all ${
              activeOption === "upload"
                ? "border-primary/40 bg-primary/5"
                : "border-border bg-card hover:border-primary/20"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                <Upload className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-foreground">Upload Listing Screenshots</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Upload 1–5 images or 1 PDF of the listing</p>
              </div>
              <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">
                Coming Soon
              </span>
            </div>
          </button>
        </motion.div>

        {/* Option 4: Browser Extension */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="w-full rounded-xl border border-border bg-card p-5 opacity-60">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                <Globe className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-foreground">Import from Browser</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  The RealHunt extension reads listing data directly from your browser for instant analysis.
                </p>
              </div>
              <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">
                Coming Soon
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Confidence note */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="mt-6 text-center"
      >
        <p className="text-[11px] text-muted-foreground">
          All analyses are saved to your intelligence archive · Full forensic report included
        </p>
      </motion.div>
    </div>
  );
};

export default ProtectedListingFallback;
