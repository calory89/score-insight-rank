import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { Calculator, DollarSign, TrendingUp, Clock, Percent } from "lucide-react";

interface Props {
  price: number;
  currency: string;
  roiLow?: number | null;
  roiHigh?: number | null;
  grossYield?: number | null;
}

const fmt = (v: number, curr: string) => {
  const s = curr === "£" ? "GBP" : curr === "$" ? "USD" : "EUR";
  return new Intl.NumberFormat("en", { style: "currency", currency: s, maximumFractionDigits: 0 }).format(v);
};

const InvestmentCalculator = ({ price, currency, roiLow, roiHigh, grossYield }: Props) => {
  const curr = currency === "GBP" ? "£" : currency === "USD" ? "$" : currency === "DKK" ? "kr" : currency === "SEK" ? "kr" : currency === "NOK" ? "kr" : "€";
  const [downPct, setDownPct] = useState(20);
  const [rate, setRate] = useState(4.5);
  const [monthlyRent, setMonthlyRent] = useState(() => {
    if (grossYield && price) return Math.round((price * (grossYield / 100)) / 12);
    return Math.round(price * 0.005);
  });
  const [appreciation, setAppreciation] = useState(() => {
    if (roiLow != null && roiHigh != null) return Math.round(((roiLow + roiHigh) / 2) / 5);
    return 3;
  });

  const calc = useMemo(() => {
    const downPayment = price * (downPct / 100);
    const loanAmount = price - downPayment;
    const monthlyRate = rate / 100 / 12;
    const numPayments = 30 * 12;
    const monthlyMortgage = loanAmount > 0 && monthlyRate > 0
      ? (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)
      : 0;
    const monthlyExpenses = price * 0.003 / 12; // ~0.3% annual maintenance
    const monthlyCashFlow = monthlyRent - monthlyMortgage - monthlyExpenses;
    const annualCashFlow = monthlyCashFlow * 12;
    const capRate = price > 0 ? ((monthlyRent * 12 - monthlyExpenses * 12) / price) * 100 : 0;
    const cashOnCash = downPayment > 0 ? (annualCashFlow / downPayment) * 100 : 0;

    // 10-year projection
    let totalEquity = downPayment;
    let totalCashFlow = 0;
    let propertyValue = price;
    for (let y = 0; y < 10; y++) {
      propertyValue *= 1 + appreciation / 100;
      totalCashFlow += annualCashFlow;
      // Principal paydown approximation
      totalEquity += loanAmount > 0 ? loanAmount / 30 : 0;
    }
    totalEquity = propertyValue - (loanAmount - loanAmount / 30 * 10);
    const totalReturn = totalEquity + totalCashFlow - downPayment;
    const totalROI = downPayment > 0 ? (totalReturn / downPayment) * 100 : 0;
    const breakEvenMonths = monthlyCashFlow > 0 ? Math.ceil(downPayment / monthlyCashFlow) : Infinity;

    return { downPayment, monthlyMortgage, monthlyCashFlow, annualCashFlow, capRate, cashOnCash, totalROI, breakEvenMonths, propertyValue };
  }, [price, downPct, rate, monthlyRent, appreciation]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-primary/15 bg-card p-6"
    >
      <div className="flex items-center gap-2 mb-5">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Calculator className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Investment Calculator</h3>
          <p className="text-[10px] text-muted-foreground">Adjust sliders to model your investment</p>
        </div>
      </div>

      {/* Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-muted-foreground">Down Payment</label>
            <span className="text-xs font-mono font-semibold text-foreground">{downPct}% ({fmt(price * downPct / 100, curr)})</span>
          </div>
          <Slider value={[downPct]} onValueChange={([v]) => setDownPct(v)} min={5} max={100} step={5} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-muted-foreground">Mortgage Rate</label>
            <span className="text-xs font-mono font-semibold text-foreground">{rate}%</span>
          </div>
          <Slider value={[rate]} onValueChange={([v]) => setRate(v)} min={1} max={10} step={0.25} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-muted-foreground">Monthly Rental Income</label>
            <span className="text-xs font-mono font-semibold text-foreground">{fmt(monthlyRent, curr)}</span>
          </div>
          <Slider value={[monthlyRent]} onValueChange={([v]) => setMonthlyRent(v)} min={0} max={Math.round(price * 0.015)} step={50} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-muted-foreground">Annual Appreciation</label>
            <span className="text-xs font-mono font-semibold text-foreground">{appreciation}%</span>
          </div>
          <Slider value={[appreciation]} onValueChange={([v]) => setAppreciation(v)} min={-5} max={15} step={0.5} />
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ResultCard
          icon={DollarSign}
          label="Monthly Cash Flow"
          value={fmt(calc.monthlyCashFlow, curr)}
          positive={calc.monthlyCashFlow >= 0}
        />
        <ResultCard
          icon={Percent}
          label="Cap Rate"
          value={`${calc.capRate.toFixed(1)}%`}
          positive={calc.capRate >= 5}
        />
        <ResultCard
          icon={TrendingUp}
          label="10yr Total ROI"
          value={`${calc.totalROI.toFixed(0)}%`}
          positive={calc.totalROI > 0}
        />
        <ResultCard
          icon={Clock}
          label="Break-Even"
          value={calc.breakEvenMonths < 600 ? `${Math.round(calc.breakEvenMonths / 12)} years` : "N/A"}
          positive={calc.breakEvenMonths < 180}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-secondary/50 border border-border p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Monthly Mortgage</p>
          <p className="text-sm font-mono font-semibold text-foreground">{fmt(calc.monthlyMortgage, curr)}</p>
        </div>
        <div className="rounded-xl bg-secondary/50 border border-border p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Property Value (10yr)</p>
          <p className="text-sm font-mono font-semibold text-primary">{fmt(calc.propertyValue, curr)}</p>
        </div>
      </div>
    </motion.div>
  );
};

const ResultCard = ({ icon: Icon, label, value, positive }: { icon: any; label: string; value: string; positive: boolean }) => (
  <div className="rounded-xl bg-secondary p-3 text-center">
    <Icon className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-1" />
    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
    <p className={`text-sm font-mono font-bold ${positive ? "text-primary" : "text-score-poor"}`}>{value}</p>
  </div>
);

export default InvestmentCalculator;
