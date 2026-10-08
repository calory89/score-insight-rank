// 8-oct-2026 (Carlos): realhunt.co/extension — download page for the "RealHunt Score" Chrome extension,
// plus its privacy policy at /extension/privacy. Linked from the header ("Score any home").
import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { t } from "./i18n";

const ZIP = "/realhunt-score.zip";
const STORE = ""; // Chrome Web Store URL once approved

function track(kind: string) {
  try { (window as any).fbq?.("trackCustom", kind); } catch { /* no pixel */ }
}

export function ExtensionPage() {
  useEffect(() => { document.title = `${t("RealHunt Score: see the real score of any home")} · RealHunt`; }, []);
  return (
    <div className="hunt-wrap xs-page">
      <section className="xs-hero">
        <span className="hunt-eyebrow">{t("FREE CHROME EXTENSION")}</span>
        <h1>{t("See the score of any home, on any listing.")}</h1>
        <p>{t("Install RealHunt Score and every home on idealista, Zillow and Rightmove gets a 0–100 score next to its price: price against the area, how complete the listing is and red flags like occupied, auction or needs renovation. With the reason for every point.")}</p>
        <div className="xs-cta">
          {STORE
            ? <a className="hunt-primary" href={STORE} target="_blank" rel="noopener" onClick={() => track("ExtensionInstall")}>{t("Add to Chrome, free")}</a>
            : <a className="hunt-primary" href={ZIP} download onClick={() => track("ExtensionDownload")}>{t("Download for Chrome, free")}</a>}
          <a className="hunt-secondary" href="#how">{t("How it works")}</a>
        </div>
        <p className="hunt-fine">{t("Works on Chrome, Edge, Brave and Arc on a computer. Free. No account needed to start.")}</p>
      </section>

      <section className="xs-show">
        <img src="/extension/card.png" alt={t("RealHunt Score card on a listing")} loading="lazy" />
        <div>
          <h2>{t("Four things, every time")}</h2>
          <ol className="xs-list">
            <li><b>{t("Price vs area")}</b> <span>{t("Price per m² against the other homes in the same area.")}</span></li>
            <li><b>{t("Listing quality")}</b> <span>{t("Photos, description and the facts that are missing: floor, energy rating, orientation, fees.")}</span></li>
            <li><b>{t("Red flags")}</b> <span>{t("Occupied, auction, bare ownership, needs renovation, cash only, months on the market.")}</span></li>
            <li><b>{t("Fit with you")}</b> <span>{t("Answer 5 questions and the score also tells you if it fits your budget and plans.")}</span></li>
          </ol>
          <p className="hunt-fine">{t("An estimate, not an appraisal. Sponsored homes never change a score.")}</p>
        </div>
      </section>

      {!STORE && (
        <section className="xs-install" id="how">
          <h2>{t("Install in 30 seconds")}</h2>
          <ol>
            <li>{t("Download the file and unzip it.")}</li>
            <li>{t("Open chrome://extensions and switch on Developer mode (top right).")}</li>
            <li>{t("Click “Load unpacked” and choose the unzipped realhunt-score folder.")}</li>
            <li>{t("Open any home on idealista, Zillow or Rightmove. The score appears by the price.")}</li>
          </ol>
          <p className="hunt-fine">{t("The one-click Chrome Web Store version is under review.")}</p>
        </section>
      )}

      <section className="xs-why">
        <div><b>{t("Free")}</b><span>{t("3 full reports a day without an account. Unlimited with just your email.")}</span></div>
        <div><b>{t("Private")}</b><span>{t("Only runs on property sites. Never stores photos or descriptions. Delete everything in one click.")}</span></div>
        <div><b>{t("Shareable")}</b><span>{t("Turn any score into an image for WhatsApp, TikTok or Instagram.")}</span></div>
      </section>
      <p className="hunt-fine"><Link to="/extension/privacy">{t("Privacy policy of the extension")}</Link></p>
    </div>
  );
}

export function ExtensionPrivacy() {
  useEffect(() => { document.title = "RealHunt Score · Privacy policy"; }, []);
  return (
    <div className="hunt-wrap hunt-legal xs-legal">
      <h1>RealHunt Score — Privacy policy</h1>
      <p className="hunt-fine">Last updated: 8 October 2026 · Controller: Equinox Investment Group LLC, 30 N Gould St Ste N, Sheridan, WY 82801, USA · Contact: carlos@equinoxinvestmentgroup.com</p>
      <h2>What the extension does</h2>
      <p>RealHunt Score shows an estimated 0–100 score on property listings on supported property websites (idealista, Zillow, Rightmove). It runs only on those websites and on nothing else you browse.</p>
      <h2>What we collect, and only after you agree</h2>
      <ul>
        <li><b>Derived listing data:</b> price, currency, size, price per m², rooms, property type, area name, days listed, the score and red-flag labels, the listing URL and a hashed listing ID. We do not collect or store photos or full descriptions from the website.</li>
        <li><b>Your profile, if you answer it:</b> budget, places, type of home, purpose and timeline.</li>
        <li><b>Your account, if you create one:</b> email and, optionally, phone, and whether you want emails from us.</li>
        <li><b>Usage events:</b> install, reports opened, saves, shares and clicks on recommendations, linked to a random ID.</li>
      </ul>
      <p>Before you agree, the score is calculated on your computer only and nothing is sent to us.</p>
      <h2>Why</h2>
      <p>To calculate and improve scores (comparing a home's price per m² with other homes in the same area), to keep your saved homes and alerts, and to show you homes on RealHunt that match your profile. Recommendations are always labelled “RealHunt pick” or “Sponsored” and never change any score. Legal basis: your consent (GDPR art. 6(1)(a)).</p>
      <h2>What we never do</h2>
      <ul>
        <li>We never sell your data and never use it for credit, lending or unrelated advertising.</li>
        <li>We never read pages outside the supported property websites.</li>
        <li>We never republish content from those websites.</li>
      </ul>
      <p>The use of information received from Google APIs complies with the Chrome Web Store User Data Policy, including the Limited Use requirements.</p>
      <h2>Where it is stored and for how long</h2>
      <p>On our database provider (Supabase, EU/US). Listing data is kept for up to 24 months; your account and profile until you delete them.</p>
      <h2>Your rights</h2>
      <p>Open the side panel and click “Delete my data” to erase your account, profile, saves and history at once, or email us. You can also ask for access, correction or a copy, and complain to your data-protection authority.</p>
    </div>
  );
}

export default function ExtensionRoute() {
  const { pathname } = useLocation();
  return pathname.startsWith("/extension/privacy") ? <ExtensionPrivacy /> : <ExtensionPage />;
}
