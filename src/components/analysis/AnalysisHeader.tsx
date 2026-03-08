import { MapPin, Building2, Calendar, Ruler, BedDouble, Bath, Home } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { scoreColor, classificationColor, verdictColor } from "@/lib/score-utils";
import { ConfidenceBadge } from "./AnalysisHelpers";
import type { Tables } from "@/integrations/supabase/types";

type AnalysisData = Tables<"analyses">;

const sqmToSqft = (sqm: number) => Math.round(sqm * 10.7639);

interface AnalysisHeaderProps {
  data: AnalysisData;
  forensic: any;
  globalScore: number | null;
  confidenceLevel: string;
}

const AnalysisHeader = ({ data: d, forensic: f, globalScore, confidenceLevel }: AnalysisHeaderProps) => {
  const imgUrl = f.listing_image_url || d.image_url;
  const hasImage = imgUrl && typeof imgUrl === 'string' && imgUrl.startsWith('http');

  return (
    <>
      {/* Property Image */}
      {hasImage && (
        <div className="h-48 md:h-64 w-full overflow-hidden relative">
          <img src={imgUrl} alt={d.address || "Property"} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <div className="absolute top-4 right-4">
            <div className="h-16 w-16 rounded-2xl bg-card/90 backdrop-blur-sm border border-border flex flex-col items-center justify-center shadow-lg">
              <span className={`text-2xl font-bold font-mono leading-none ${scoreColor(globalScore)}`}>{globalScore}</span>
              <span className="text-[7px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">Score</span>
            </div>
          </div>
          <div className="absolute top-4 left-4 flex flex-wrap gap-1.5">
            <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border backdrop-blur-sm bg-card/80 ${classificationColor(d.market_classification)}`}>{d.market_classification}</span>
            <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border backdrop-blur-sm bg-card/80 ${verdictColor(d.verdict)}`}>{d.verdict}</span>
          </div>
        </div>
      )}

      {/* Property Info */}
      <div className="p-5 md:p-6">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {!hasImage && (
            <>
              <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border ${classificationColor(d.market_classification)}`}>{d.market_classification}</span>
              <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border ${verdictColor(d.verdict)}`}>{d.verdict}</span>
            </>
          )}
          <ConfidenceBadge level={confidenceLevel} />
          {f.renovation_status && <Badge variant="outline" className="text-[10px]">{f.renovation_status}</Badge>}
          {f.energy_rating && <Badge variant="outline" className="text-[10px]">Energy: {f.energy_rating}</Badge>}
        </div>

        <h1 className="text-xl md:text-2xl font-bold text-foreground mb-1">{d.address || `${d.city}, ${d.country}`}</h1>
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
          <MapPin className="h-3.5 w-3.5" /> {d.city}, {d.country}
        </div>
        <p className="text-2xl md:text-3xl font-bold font-mono text-foreground mb-3">{d.price}</p>

        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          {d.property_type && <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {d.property_type}</span>}
          {d.size_sqm != null && <span className="flex items-center gap-1"><Ruler className="h-3.5 w-3.5" />{d.size_sqm} m² · {sqmToSqft(d.size_sqm)} ft²</span>}
          {d.bedrooms != null && <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" /> {d.bedrooms} bed</span>}
          {d.bathrooms != null && <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" /> {d.bathrooms} bath</span>}
          {d.year_built != null && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Built {d.year_built}</span>}
          {f.floor_info && <span className="flex items-center gap-1"><Home className="h-3.5 w-3.5" /> {f.floor_info}</span>}
        </div>
        {f.property_features?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {(f.property_features as string[]).map((feat: string, i: number) => (
              <Badge key={i} variant="secondary" className="text-[10px] font-normal">{feat}</Badge>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default AnalysisHeader;
