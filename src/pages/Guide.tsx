import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import RHNav from "@/components/realhunt/RHNav";
import { db, eur, FLAG, IG, COSTS, totalCost, slug, unslug, srcSet, track } from "@/lib/rh";

const STEPS: Record<string, string[]> = {
  Italy: ["Get a codice fiscale (tax code) at any Agenzia delle Entrate or Italian consulate. Free, same day.", "Open an Italian bank account or use a notary escrow for the payment.", "Sign a proposta d'acquisto (offer) with a small deposit, then the compromesso (preliminary contract, usually 10 to 20% deposit).", "The notaio checks title, debts and building permits. Ask for the certificato di agibilità and any condono.", "Sign the rogito (final deed) at the notary. Taxes are paid at that moment. You can give a power of attorney and not travel.", "Register utilities and, if it is a village home, ask the comune about the €1 house or renovation grants."],
  Spain: ["Get an NIE (foreigner tax number) at a Spanish consulate or police station. Needed to sign anything.", "Hire an independent lawyer (about €1,500). Do not use the seller's.", "Ask for the nota simple from the Land Registry: ownership, debts, embargos. Free through your lawyer.", "Sign the contrato de arras (deposit contract, usually 10%). If you pull out you lose it, if the seller does they pay double.", "Sign the escritura at the notary, pay ITP transfer tax (6 to 10% by region) within 30 days.", "Register the deed and change utilities and IBI (property tax) to your name."],
  Portugal: ["Get a NIF (tax number) through a lawyer or fiscal representative, from abroad if needed.", "Ask for the caderneta predial and certidão permanente: they show the legal and tax status.", "Sign the CPCV (promissory contract) with a 10 to 30% deposit.", "Pay IMT and stamp duty before the deed, then sign the escritura at a notary or a Casa Pronta desk.", "Register the property, switch water and electricity."],
  France: ["No tax number needed to buy. The notaire handles everything and represents both sides.", "Sign the compromis de vente. You get a 10 day cooling-off period by law.", "The notaire checks title, easements, diagnostics (lead, asbestos, energy). Ask for the DPE energy rating.", "Two to three months later sign the acte de vente. Notaire fees of 7 to 8% include the taxes.", "Register with the mairie for taxe foncière and habitation."],
  Greece: ["Get an AFM (tax number) and open a Greek bank account, both need a lawyer or accountant as proxy.", "Your lawyer checks the Land Registry (Ktimatologio) and forest maps. Many rural plots have title issues.", "Sign a preliminary agreement, then the final contract before a notary. Transfer tax 3% is paid first.", "Non-EU buyers in border areas need a permit."],
  Japan: ["Anyone can own freehold in Japan. No residency needed.", "Work with a licensed agent (takken) who prepares the juyo jiko setsumei (important matters disclosure).", "Sign the contract with a 5 to 10% deposit, then transfer the rest through a judicial scrivener (shiho shoshi) who registers the title.", "Budget for acquisition tax, registration and the agent's 3% + ¥60,000.", "Old akiya often need roof and plumbing work. Ask for the inspection report and check the road access (setsudo)."],
  Sweden: ["Anyone can buy, no permit. Most homes are freehold or a bostadsrätt (co-op share).", "Bidding is open and by phone or app. Check the objektbeskrivning and energy declaration.", "Sign the köpekontrakt with a 10% deposit, then the köpebrev on handover.", "Stamp duty is 1.5%. No notary. The estate agent registers the deed with Lantmäteriet."],
  Norway: ["Anyone can buy. Bidding is done through the agent within a deadline.", "Read the tilstandsrapport (condition report) carefully, it decides what you can claim later.", "Document fee 2.5% on transfer. No notary."],
  Denmark: ["Non-EU citizens need permission from the Ministry of Justice unless they have lived in Denmark for 5 years. EU citizens moving in can buy freely.", "Use a buyer's lawyer (advokatforbehold clause) so you can cancel after signing.", "Registration fee 0.6% plus a fixed fee. Check the tilstandsrapport and el-installationsrapport."],
  Finland: ["Anyone from the EU can buy. Others need a permit from the Ministry of Defence, usually granted.", "Transfer tax 3% on real estate, 1.5% on housing company shares. No notary, a public purchase witness signs.", "Ask for the isännöitsijäntodistus if it is an apartment: it lists planned renovations and debts."],
  Indonesia: ["Foreigners cannot own freehold land. What you buy is a long lease (80 years that extends) or shares in a PT company.", "Check who holds the land certificate and that the lease is registered at the notary.", "Pay in instalments as the contract says, never in cash to a person."],
};

const Guide = () => {
  const { country: cp } = useParams();
  const c = useMemo(() => unslug(cp || "", Object.keys(COSTS)), [cp]);
  const cost = COSTS[c];
  const steps = STEPS[c] || ["Get a local tax number and a lawyer who works for you, not the seller.", "Check the title at the land registry and any debts on the property.", "Sign a preliminary contract with a deposit, then the deed before a notary.", "Pay transfer tax and register the deed in your name."];
  const [homes, setHomes] = useState<IG[]>([]);
  useEffect(() => { document.title = `How to buy a home in ${c} as a foreigner · RealHunt`; track("guide_view", { meta: { c } }); db.from("ig_finds").select("shortcode,image_urls,price_eur,location_name,hook,country_guess").eq("country_guess", c).neq("status", "hidden").lte("price_eur", 100000).order("rank_score", { ascending: false }).limit(4).then(({ data }: any) => setHomes(data || [])); }, [c]);
  return (
    <div className="min-h-screen bg-paper text-ink">
      <RHNav />
      <article className="max-w-[760px] mx-auto px-4 md:px-6 py-10">
        <p className="text-[11px] uppercase tracking-[0.16em] text-ink-muted">Buying guide</p>
        <h1 className="font-display text-[clamp(30px,5vw,48px)] leading-[1.05] tracking-tight mt-2">{FLAG[c]} How to buy a home in {c} as a foreigner</h1>
        {cost && <div className="mt-6 border border-hairline rounded-2xl bg-white p-5"><p className="font-display text-[18px]">What it costs on top of the price</p><p className="text-[15px] mt-1">About <b>{cost.pct}%</b>{cost.fixed ? <> plus <b>{eur(cost.fixed)}</b> in notary and registry</> : ""}. {cost.note}</p><p className="text-[13px] text-ink-muted mt-2">Example: a {eur(30000)} home costs about {eur(totalCost(30000, c)!)} all in. Estimate, before renovation.</p></div>}
        <h2 className="font-display text-[22px] mt-8 mb-3">Step by step</h2>
        <ol className="flex flex-col gap-3">{steps.map((s, i) => <li key={i} className="flex gap-3 text-[15px] leading-relaxed"><span className="font-display text-[20px] text-ink-muted w-7 shrink-0">{i + 1}</span><span>{s}</span></li>)}</ol>
        <p className="mt-8 text-[13px] text-ink-muted">This is general orientation, not legal or tax advice. Rules change by region and by your residency. Always use a lawyer in the country before paying anyone. <Link to="/legal/terms" className="underline">Terms</Link></p>
        {homes.length > 0 && <><h2 className="font-display text-[22px] mt-10 mb-3">Homes under €60,000 in {c} right now</h2><div className="grid grid-cols-2 gap-3">{homes.map((f) => <Link key={f.shortcode} to={`/find/${f.shortcode}`} className="relative block rounded-2xl overflow-hidden aspect-[4/5] bg-hairline/30"><img src={f.image_urls![0]} srcSet={srcSet(f.image_urls![0])} sizes="50vw" alt="" className="absolute inset-0 w-full h-full object-cover" /><div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent" />{f.price_eur && <span className="absolute top-2.5 left-2.5 px-2 py-1 rounded-full bg-white text-ink text-[12px] font-semibold tabular-nums shadow">{eur(f.price_eur)}</span>}<p className="absolute bottom-3 left-3 right-3 text-white text-[12px] line-clamp-2">{f.hook || f.location_name}</p></Link>)}</div><Link to={`/country/${slug(c)}`} className="inline-block mt-4 underline">All homes in {c}</Link></>}
      </article>
    </div>
  );
};
export default Guide;
