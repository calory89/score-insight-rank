// /network/reservation-contract — a plain-English reservation agreement template developers can fill in and print.
// Not legal advice: every country has its own rules, so the page tells them to have a local lawyer check it.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Printer, ChevronLeft, AlertTriangle } from "lucide-react";

const F: [string, string][] = [
  ["seller", "Developer (company name and registration number)"], ["seller_addr", "Developer address"],
  ["buyer", "Buyer full name"], ["buyer_id", "Buyer passport or ID number"], ["buyer_addr", "Buyer address"],
  ["project", "Project name"], ["unit", "Unit (number, floor, type)"], ["size", "Size (m²)"], ["address", "Property address"],
  ["price", "Total price (€ or local currency)"], ["deposit", "Reservation deposit"], ["deposit_days", "Days to sign the purchase contract"],
  ["plan", "Payment plan after the purchase contract"], ["handover", "Expected handover date"], ["refund", "Refund if the developer cannot sell (days)"],
  ["law", "Country / law that applies"], ["place_date", "Place and date"],
];

export default function ReservationContract() {
  const [v, setV] = useState<Record<string, string>>({ deposit_days: "30", refund: "14" });
  useEffect(() => { document.title = "Free reservation contract template · RealHunt Network"; }, []);
  const x = (k: string) => (v[k] ? <b>{v[k]}</b> : <span className="inline-block min-w-[140px] border-b border-dotted border-[#999]">&nbsp;</span>);
  return (
    <div className="min-h-screen bg-[#EFF0F1] py-8 px-4 print:bg-white print:p-0">
      <div className="max-w-[860px] mx-auto print:hidden">
        <Link to="/network" className="inline-flex items-center gap-1 text-[14px]"><ChevronLeft size={16} /> RealHunt Network</Link>
        <h1 className="font-display text-[34px] tracking-tight mt-3">Reservation contract template</h1>
        <p className="text-[15px] text-ink-muted mt-1 max-w-[62ch]">Fill in the blanks, then print or save as PDF. It takes a unit off the market for a deposit while both sides prepare the purchase contract.</p>
        <p className="mt-3 rounded-xl bg-amber-50 border border-amber-300 p-3 text-[14px] inline-flex gap-2"><AlertTriangle size={18} className="shrink-0 text-amber-700" /> This is a starting point, not legal advice. Each country has its own rules (for example arras in Spain, a promesa in Mexico, a PPJB in Indonesia, a notarised preliminary contract in Albania). Have a local lawyer check it before anyone signs.</p>
        <div className="mt-5 grid md:grid-cols-2 gap-3">{F.map(([k, l]) => (
          <label key={k} className="flex flex-col gap-1 text-[13px]"><span className="text-ink-muted">{l}</span><input value={v[k] || ""} onChange={(e) => setV({ ...v, [k]: e.target.value })} className="h-10 px-3 rounded-xl border border-hairline bg-white text-[14px]" /></label>
        ))}</div>
        <button onClick={() => window.print()} className="rh-btn-primary inline-flex items-center gap-2 mt-5"><Printer size={16} /> Print or save as PDF</button>
      </div>
      <article className="max-w-[860px] mx-auto mt-8 print:mt-0 bg-white rounded-2xl print:rounded-none p-8 md:p-12 text-[14px] leading-relaxed text-[#111214] shadow-sm print:shadow-none">
        <h2 className="text-center font-display text-[24px]">Reservation Agreement</h2>
        <p className="text-center text-[12px] text-[#5E6269]">{x("project")} · {x("unit")}</p>
        <p className="mt-6"><b>Between</b> {x("seller")}, of {x("seller_addr")} (the “Developer”), and {x("buyer")}, ID {x("buyer_id")}, of {x("buyer_addr")} (the “Buyer”).</p>
        <ol className="mt-4 list-decimal pl-5 flex flex-col gap-3">
          <li><b>The unit.</b> The Developer reserves for the Buyer unit {x("unit")} of about {x("size")} m² in {x("project")}, at {x("address")}, as shown in the plans and specifications attached.</li>
          <li><b>Price.</b> The total price is {x("price")}, including the items listed in the specifications. Taxes, notary and registration costs are paid as the law of {x("law")} says, unless both sides agree otherwise in writing.</li>
          <li><b>Deposit.</b> The Buyer pays a reservation deposit of {x("deposit")} to the Developer's company bank account. The deposit counts towards the price.</li>
          <li><b>Off the market.</b> From the day the deposit arrives, the Developer does not offer or sell the unit to anyone else for {x("deposit_days")} days.</li>
          <li><b>Purchase contract.</b> Within {x("deposit_days")} days both sides sign the purchase contract, with this payment plan: {x("plan")}. Expected handover: {x("handover")}.</li>
          <li><b>If the Buyer walks away</b> without a reason in this agreement, the Developer may keep the deposit.</li>
          <li><b>If the Developer cannot sell</b> (for example the permits, title or specifications turn out different), the Developer returns the full deposit within {x("refund")} days.</li>
          <li><b>Checks.</b> The Buyer may have a lawyer check the title, licences and permits before signing the purchase contract. If the checks show a serious problem, the Buyer gets the full deposit back.</li>
          <li><b>Law.</b> This agreement follows the law of {x("law")}. Where that law requires a specific form (for example a notary), both sides will use it.</li>
        </ol>
        <div className="mt-10 grid grid-cols-2 gap-10">
          <div><p className="border-t border-[#111214] pt-2">Developer</p></div>
          <div><p className="border-t border-[#111214] pt-2">Buyer</p></div>
        </div>
        <p className="mt-6">{x("place_date")}</p>
        <p className="mt-8 text-[11px] text-[#5E6269]">Template provided by RealHunt (realhunt.co) as a free starting point. It is not legal advice; check it with a local lawyer.</p>
      </article>
    </div>
  );
}
