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
        <p>{t("Install RealHunt Score and every home on 160 property sites in 50 countries (idealista, Fotocasa, Zillow, Rightmove, Zoopla, Boligsiden, SeLoger, ImmoScout24, Funda, Immobiliare and more) gets a 0–100 score next to its price: price against similar homes nearby, what's within a walk, red flags like occupied, auction or needs renovation, and what the home really has. One honest line, and the reason for every point.")}</p>
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
          <h2>{t("Five things, every time")}</h2>
          <ol className="xs-list">
            <li><b>{t("Price vs similar homes")}</b> <span>{t("Price per m² against similar-size homes within 1 to 5 km. Every search you make adds comparables.")}</span></li>
            <li><b>{t("Location")}</b> <span>{t("Transport, food shops, schools, pharmacies, parks and beach within a 10-minute walk, from OpenStreetMap.")}</span></li>
            <li><b>{t("Red flags")}</b> <span>{t("Occupied, auction, bare ownership, needs renovation, cash only, months on the market.")}</span></li>
            <li><b>{t("The home and the listing")}</b> <span>{t("Terrace, lift, parking, pool, views, renovated, plus the facts the listing leaves out.")}</span></li>
            <li><b>{t("Fit with you")}</b> <span>{t("Answer 5 questions and the score also tells you if it fits your budget and plans.")}</span></li>
          </ol>
          <p><b>{t("New: rank the whole search.")}</b> {t("One click on any search page reads every page of results (up to 500) at a person's pace and sorts all the homes by RealHunt score, best first, while it loads. Download the list as CSV.")}</p>
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
            <li>{t("Open any home on a property site. The score appears by the price. On a search page, click “Rank the whole search” to sort every page by score.")}</li>
          </ol>
          <p className="hunt-fine">{t("The one-click Chrome Web Store version is under review.")}</p>
        </section>
      )}

      <section className="xs-why">
        <div><b>{t("Free")}</b><span>{t("Free forever. Unlimited full reports with just your email, no password.")}</span></div>
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
      <p className="hunt-fine">Last updated: 9 October 2026 (v0.4) · Controller: Equinox Investment Group LLC, 30 N Gould St Ste N, Sheridan, WY 82801, USA · Contact: carlos@equinoxinvestmentgroup.com</p>
      <h2>What the extension does</h2>
      <p>RealHunt Score shows an estimated 0–100 score on property listings on supported property websites (about 160 property portals, listed in the extension's manifest, plus any other property website you choose to allow from the side panel). It runs only on those websites and on nothing else you browse.</p>
      <h2>What we collect, and only after you agree</h2>
      <ul>
        <li><b>Comparable homes on your computer:</b> the price, size, price per m², area and map point of the homes on search pages you open are kept in your browser to compare listings. They leave your browser only after you agree (next point).</li>
        <li><b>Derived listing data:</b> price, currency, size, price per m², rooms, property type, area name, days listed, the score and red-flag labels, the listing URL and a hashed listing ID. We do not collect or store photos or full descriptions from the website.</li>
        <li><b>Your profile, if you answer it:</b> budget, places, type of home, purpose and timeline.</li>
        <li><b>Your account, if you create one:</b> email (checked with a 6-digit code we email you), optionally phone, and whether you want emails from us.</li>
        <li><b>What you look at:</b> the homes you open (their derived numbers above), the ones you save and share. From them we build your taste profile (price range, areas, size, type) to recommend homes and, only if you ticked the box, to email you homes and price drops that match.</li>
        <li><b>Usage events:</b> install, reports opened, saves, shares and clicks on recommendations, linked to a random ID.</li>
      </ul>
      <p>Before you agree, the score is calculated on your computer only and nothing is sent to us.</p>
      <h2>Location check</h2>
      <p>To count what is within a walk of a home, the extension sends that listing's published map point (never your own location) to the OpenStreetMap Overpass service (overpass-api.de, with overpass.kumi.systems as a backup). If your network blocks it and you have agreed to these terms, our server asks OpenStreetMap instead. Answers are cached for 30 days.</p>
      <h2>Ranking a whole search</h2>
      <p>If you click “Rank the whole search”, the extension opens the next pages of that same search on that website, from your browser and at about one page every one to two seconds, and reads the same listing numbers as above. It stops when you click Stop, at 500 pages, or if the website asks it to slow down. After you agree, the derived numbers of those homes (never photos or descriptions) are sent to us to improve price comparisons, as above.</p>
      <h2>Other property websites you allow</h2>
      <p>From the side panel you can allow the extension on a property website that is not on our list. Chrome asks for your permission for that website only, and you can remove it at any time in Chrome's extension settings.</p>
      <h2>AI reading of descriptions</h2>
      <p>After you agree, the text of the listing you open is sent to our server and read by an AI model (through Lovable's AI gateway, using Google Gemini) to find red flags and highlights. We keep only the result (labels and short quotes) for 7 days to avoid reading the same listing twice; we never store the full text.</p>
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
