import OriginalListingLink from "@/components/realhunt/OriginalListingLink";
import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, ExternalLink, MapPin, BadgeCheck } from "lucide-react";
import PhotoGallery from "@/components/realhunt/PhotoGallery";
import DecisionSummary from "@/components/realhunt/DecisionSummary";
import { readSession } from "@/lib/catalog";
import { safeReturnPath } from "@/lib/auth-return";
import { COMO } from "@/lib/catalog";
import RHNav from "@/components/realhunt/RHNav";
import CaptureInline from "@/components/realhunt/CaptureInline";
import { eur, srcSet, track, totalCost, COSTS } from "@/lib/rh";

// The promoted Lake Como listing. It used to be a card that threw you straight out to Instagram,
// which meant the one listing we are paid to feature was the only one without a page of its own.
// Now it behaves like every other home: card -> page -> the original listing, which lives on
// idealista. We never pretend to host it, and everything stated here is what we actually know.
const URL = "https://www.idealista.it/es/immobile/36683836/";
const PRICE = 46000;
const PHOTO = "/finds/como-1.webp";

const Como = () => {
  const route = useLocation();
  const backTo = safeReturnPath(route.state?.catalogUrl || readSession("rh_catalog_url", "/"));
  useEffect(() => {
    document.title = "€46,000 home on Lake Como, Italy · RealHunt";
    track("view", { find: "como-1", meta: { promoted: true } });
  }, []);

  const total = totalCost(PRICE, "Italy");
  const cost = COSTS["Italy"];

  return (
    <div className="min-h-screen bg-paper text-ink">
      <RHNav />

      <div className="max-w-[1100px] mx-auto px-4 md:px-6 pt-5">
        <Link to={backTo} className="inline-flex items-center gap-1.5 text-[13.5px] text-ink-muted hover:text-ink transition-colors">
          <ArrowLeft size={15} /> Back to results
        </Link>
      </div>

      <section className="max-w-[1100px] mx-auto px-4 md:px-6 pt-4 pb-10">
        <PhotoGallery images={[PHOTO]} title="Lake Como, Italy" rememberKey="como-1" eager />

        <div className="grid md:grid-cols-[1fr_320px] gap-8 md:gap-10 mt-7">
          <div>
            <p className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted">
              <MapPin size={14} /> Lake Como, Italy 🇮🇹
            </p>
            <h1 className="font-display text-[clamp(34px,6vw,56px)] leading-none tracking-tight mt-3 tabular-nums">{eur(PRICE)}</h1>
            <p className="text-[15px] text-ink-muted mt-2">A home on Lake Como for the price of a car. Listed by an Italian agency on idealista.</p>

            <DecisionSummary home={COMO} />
            <div className="mt-7 space-y-4 text-[15px] leading-relaxed">
              <p>
                Lake Como is the part of Italy people put on a moodboard and assume they will never afford.
                Most of what is sold around the lake runs into the hundreds of thousands. This one does not,
                which is the whole reason it is on RealHunt.
              </p>
              <p>
                We have not visited it and we are not the agent. What we do is point you at the original
                listing, with the price we saw and the costs Italy adds on top, so you can judge it yourself
                instead of falling for a photo.
              </p>
            </div>

            {cost && (
              <div className="mt-8 border border-hairline rounded-2xl bg-white p-5 md:p-6">
                <p className="font-display text-[19px] tracking-tight">What it really costs to buy in Italy</p>
                {total && (
                  <p className="text-[15px] mt-2">
                    Asking price {eur(PRICE)} · realistic all-in <b className="tabular-nums">{eur(total)}</b>
                  </p>
                )}
                <p className="text-[13.5px] text-ink-muted leading-relaxed mt-2">{cost.note}</p>
                <p className="text-[12px] text-ink-soft mt-3">Rough orientation, not a quote. Ask the agent for the exact figures before you commit to anything.</p>
              </div>
            )}

            <OriginalListingLink href={URL} target="_blank" rel="noopener noreferrer"
              onClick={() => track("click", { find: "como-1", meta: { promoted: true, out: "idealista" } })}
              className="mt-8 w-full md:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full bg-ink text-paper text-[15px] font-semibold hover:opacity-90 transition-opacity">
              See the full listing on idealista <ExternalLink size={16} />
            </OriginalListingLink>
            <p className="text-[12.5px] text-ink-muted mt-3">Opens idealista.it, where the photos, the size and the agent's contact details are.</p>

            <div className="mt-10">
              <CaptureInline
                source="como_page"
                title="More homes like this one, every week"
                subtitle="Free. Only homes under €60k worth talking about — with the address and the original link."
                cta="Send me the top 10" />
            </div>

            <p className="mt-8 text-[12px] text-ink-muted leading-relaxed">
              This is a promoted listing. RealHunt does not own, host or sell this property and earns nothing
              from your visit to the listing. Price and availability are the seller's and can change or
              disappear without notice.
            </p>
          </div>

          <aside className="md:pt-1">
            <div className="md:sticky md:top-24 border border-hairline rounded-2xl bg-white p-5">
              <p className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-muted"><BadgeCheck size={14} /> Featured home</p>
              <p className="font-display text-[30px] tracking-tight mt-2 tabular-nums">{eur(PRICE)}</p>
              <p className="text-[13.5px] text-ink-muted mt-1">Lake Como, Italy</p>
              <OriginalListingLink href={URL} target="_blank" rel="noopener noreferrer"
                onClick={() => track("click", { find: "como-1", meta: { promoted: true, out: "idealista", where: "aside" } })}
                className="mt-4 w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-ink text-paper text-[14px] font-semibold hover:opacity-90 transition-opacity">
                Open the listing <ExternalLink size={15} />
              </OriginalListingLink>
              <Link to="/" className="mt-2.5 w-full inline-flex items-center justify-center px-5 py-3 rounded-full border border-hairline text-[14px] font-medium hover:border-ink transition-colors">
                Browse all homes
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
};

export default Como;

