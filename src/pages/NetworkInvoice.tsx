// /network/invoice/:id — printable commission invoice for a reported sale (developer's own deals only).
// Card payment (Stripe) is not connected yet: RealHunt sends the payment details with the invoice.
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { db, eur, COMPANY } from "@/lib/rh";
import { PAYMENT_DAYS } from "@/lib/agreement";
import { Printer, ChevronLeft, Loader2 } from "lucide-react";

export default function NetworkInvoice() {
  const { id = "" } = useParams();
  const { user } = useAuth() as any;
  const [ov, setOv] = useState<any>(undefined);
  useEffect(() => { document.title = "Invoice · RealHunt Network"; if (user) db.rpc("dev_overview").then(({ data }: any) => setOv(data || null), () => setOv(null)); }, [user?.id]);
  if (!user) return <div className="p-10">Sign in to see your invoices. <Link to="/network/app" className="underline">Developer panel</Link></div>;
  if (ov === undefined) return <div className="p-10"><Loader2 className="animate-spin" /></div>;
  const deal = ov?.deals?.find((d: any) => d.id === id);
  if (!deal) return <div className="p-10">Invoice not found. <Link to="/network/app/deals" className="underline">Back to commissions</Link></div>;
  const dev = ov.developer;
  const date = new Date(deal.invoiced_at || deal.reported_at || Date.now());
  const due = new Date(date.getTime() + PAYMENT_DAYS * 864e5);
  const no = `RH-${date.getFullYear()}-${String(deal.id).slice(0, 6).toUpperCase()}`;
  const f = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  return (
    <div className="min-h-screen bg-[#F4F2EC] py-8 px-4 print:bg-white print:p-0">
      <div className="max-w-[820px] mx-auto flex justify-between mb-4 print:hidden">
        <Link to="/network/app/deals" className="inline-flex items-center gap-1 text-[14px]"><ChevronLeft size={16} /> Commissions</Link>
        <button onClick={() => window.print()} className="rh-btn-primary !py-2 !px-4 inline-flex items-center gap-2"><Printer size={16} /> Print or save as PDF</button>
      </div>
      <article className="max-w-[820px] mx-auto bg-white rounded-2xl print:rounded-none p-8 md:p-12 text-[14px] text-[#16150F] shadow-sm print:shadow-none">
        <header className="flex justify-between gap-6 flex-wrap">
          <div><p className="font-display text-[26px]">RealHunt</p><p className="text-[#6B675C] mt-1 whitespace-pre-line">{COMPANY.name}{"\n"}{COMPANY.address}{"\n"}{COMPANY.email}</p></div>
          <div className="text-right"><p className="font-display text-[26px]">Invoice</p><p className="mt-1">No. <b>{no}</b></p><p>Date: {f(date)}</p><p>Due: <b>{f(due)}</b></p></div>
        </header>
        <section className="mt-8"><p className="text-[12px] uppercase tracking-[0.14em] text-[#6B675C]">Bill to</p><p className="mt-1 whitespace-pre-line">{[dev.company, dev.contact_name, dev.email, dev.website, dev.country].filter(Boolean).join("\n")}</p></section>
        <table className="w-full mt-8 border-collapse">
          <thead><tr className="text-left text-[12px] text-[#6B675C] border-b border-[#ECE7DC]"><th className="py-2">Description</th><th className="py-2 text-right">Sale price</th><th className="py-2 text-right">Rate</th><th className="py-2 text-right">Amount</th></tr></thead>
          <tbody><tr className="border-b border-[#ECE7DC]"><td className="py-3">Commission on a sale to a buyer introduced by RealHunt (introduction {String(deal.introduction_id || "").slice(0, 8)}, buyer {deal.buyer}…){deal.notes ? ` · ${deal.notes}` : ""}</td><td className="py-3 text-right tabular-nums">{eur(Number(deal.sale_price))}</td><td className="py-3 text-right">{deal.commission_pct}%</td><td className="py-3 text-right tabular-nums">{eur(Number(deal.commission_eur))}</td></tr></tbody>
          <tfoot><tr><td colSpan={3} className="pt-4 text-right font-semibold">Total due</td><td className="pt-4 text-right font-display text-[22px] tabular-nums">{eur(Number(deal.commission_eur))}</td></tr></tfoot>
        </table>
        <p className="mt-8 text-[13px] text-[#6B675C]">Under the RealHunt Network Agreement, clause 3 and 6. Payment within {PAYMENT_DAYS} days. RealHunt sends the payment details with this invoice by email; card payment will be available here soon. Amounts in euros, before any local taxes that apply to the payer.</p>
        <p className="mt-2 text-[13px] text-[#6B675C]">Status: {deal.status}{deal.paid_at ? ` · paid ${f(new Date(deal.paid_at))}` : ""}</p>
      </article>
    </div>
  );
}
