import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from "recharts";
import { Target } from "lucide-react";
import { SectionHeader, Section } from "./AnalysisHelpers";

interface RadarDataPoint {
  metric: string;
  value: number | null;
  market: number;
}

interface AnalysisRadarProps {
  radarData: RadarDataPoint[];
}

const AnalysisRadar = ({ radarData }: AnalysisRadarProps) => {
  return (
    <Section delay={0.18} className="rounded-2xl border border-border bg-card p-6 mb-8">
      <SectionHeader icon={Target} title="Property vs Market Average" subtitle="5-axis comparison" />
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData}>
            <PolarGrid stroke="hsl(220, 14%, 14%)" />
            <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "hsl(220, 10%, 50%)" }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Radar name="This Property" dataKey="value" stroke="hsl(160, 84%, 39%)" fill="hsl(160, 84%, 39%)" fillOpacity={0.2} strokeWidth={2} />
            <Radar name="Market Average" dataKey="market" stroke="hsl(220, 10%, 50%)" fill="hsl(220, 10%, 50%)" fillOpacity={0.05} strokeWidth={1} strokeDasharray="4 4" />
            <Tooltip contentStyle={{ background: "hsl(220, 18%, 7%)", border: "1px solid hsl(220, 14%, 14%)", borderRadius: 8, fontSize: 12 }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </Section>
  );
};

export default AnalysisRadar;
