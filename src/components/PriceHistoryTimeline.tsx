import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from "recharts";

interface PricePoint {
  date: string;
  price: number;
}

interface Props {
  priceHistory: any[] | null;
  currentPrice: string | null;
  currency?: string;
}

export default function PriceHistoryTimeline({ priceHistory, currentPrice, currency = "€" }: Props) {
  const data = useMemo(() => {
    if (!priceHistory || !Array.isArray(priceHistory) || priceHistory.length === 0) return [];

    return priceHistory
      .map((p: any) => ({
        date: p.date || p.month || p.period || "",
        price: typeof p.price === "number" ? p.price : parseFloat(String(p.price || "0").replace(/[^0-9.]/g, "")),
      }))
      .filter((p: PricePoint) => p.date && p.price > 0)
      .sort((a: PricePoint, b: PricePoint) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [priceHistory]);

  if (data.length < 2) return null;

  const first = data[0].price;
  const last = data[data.length - 1].price;
  const change = ((last - first) / first) * 100;
  const isUp = change > 0;
  const isFlat = Math.abs(change) < 1;

  const formatPrice = (val: number) =>
    `${currency}${val >= 1000000 ? (val / 1000000).toFixed(1) + "M" : val >= 1000 ? Math.round(val / 1000) + "K" : val}`;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            {isFlat ? <Minus className="h-4 w-4 text-muted-foreground" /> :
              isUp ? <TrendingUp className="h-4 w-4 text-primary" /> :
              <TrendingDown className="h-4 w-4 text-destructive" />}
            Price History
          </CardTitle>
          <span className={`text-xs font-semibold ${isFlat ? "text-muted-foreground" : isUp ? "text-primary" : "text-destructive"}`}>
            {isUp ? "+" : ""}{change.toFixed(1)}%
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isUp ? "hsl(var(--primary))" : "hsl(var(--destructive))"} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={isUp ? "hsl(var(--primary))" : "hsl(var(--destructive))"} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={formatPrice} />
              <Tooltip
                formatter={(v: number) => [formatPrice(v), "Price"]}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke={isUp ? "hsl(var(--primary))" : "hsl(var(--destructive))"}
                strokeWidth={2}
                fill="url(#priceGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
          <span>{data[0].date}: {formatPrice(first)}</span>
          <span>Current: {formatPrice(last)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
