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
        <p>{t("Install RealHunt Score and every home on any property website, from the big portals (idealista, Fotocasa, Zillow, Rightmove, Zoopla, Boligsiden, SeLoger, ImmoScout24, Funda, Immobiliare) to any local agency with listings, in any country, gets a 0–100 score next to its price: price against similar homes nearby, what's within a walk, red flags like occupied, auction or needs renovation, and what the home really has. One honest line, and the reason for every point.")}</p>
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
          <p><b>{t("New: the smart card.")}</b> {t("Open any home and the card fills in as it loads: how much over or under the market in money, what to offer, the monthly cost and rent, price history, the same home on other sites, questions for the agent, better options nearby and the top 10 homes in that city.")}</p>
          <p><b>{t("New: rank the whole search.")}</b> {t("One click on any search page reads every page of results (up to 500) at a person's pace and sorts all the homes by RealHunt score, best first, while it loads. Download the list as CSV.")}</p>
          <p><b>{t("New in 0.13: the most accurate score yet, and no surprises.")}</b> {t("Each fair price now uses the tax value, the plot and the 8 nearest similar homes, plus the portal's own estimate as a second opinion; we test it on every search and show you its error. Homes are marked ≈ until read in full, the top 20 are checked automatically, and when you open a home it tells you exactly what changed and why.")}</p>
          <p><b>{t("New in 0.12: the ranking follows the map.")}</b> {t("Move the map or change a filter and the whole area is ranked again in seconds — on Zillow up to 948 homes at once. Every badge on the page shows the same score as the ranking and its place (#3 of 948); hover a home to light it up on the page, filter the 80+ steals or the newest, and share your top 3 as an image.")}</p>
          <p><b>{t("New in 0.10: rentals too, and the best homes go public.")}</b> {t("Scores now work on rentals on any site, each rent against its fair rent (weekly and yearly rents converted, holiday lets left out), with what it costs per year, the deposit and whether buying would be cheaper. Your best finds, scoring 85+, appear on realhunt.co/best for everyone, and the homes you like teach the score your taste.")}</p>
          <p><b>{t("New in 0.9: location that knows the neighbourhood.")}</b> {t("Location now uses any map on the page or finds the address, counts cafés and restaurants too, compares the neighbourhood's prices with the city and tells you the distance to the centre. Set “my place” once (work, school, family) to see distance and travel time on every home and to sort a whole search by it. Your free account is remembered on your Chrome, also after updates.")}</p>
          <p><b>{t("New in 0.8: a fair price for every home.")}</b> {t("The score now estimates what each home should cost from the homes around it (size, bedrooms, bathrooms, plot, age, type and exact area) and tells you how far the asking price is from it. It reads every fact the card shows, hides homes that are pending or sold, flags mobile homes, land leases, timeshares, foreclosures and flood zones, and then opens the best 30 listings one by one to read them in full, map included. Scores now really spread: a great deal scores 85 to 95, an average home around 60.")}</p>
          <p><b>{t("New in 0.7.")}</b> {t("Gold, silver and bronze frames on the 3 best homes of every search page, a “best here” button that jumps to it, hide weak homes, continue a ranking after a site slows you down, reopen your last ranking, private notes and 👍/👎 on each home, map and Street View, share by WhatsApp or email, and price per bedroom on sites that don't publish m².")}</p>
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
      <p className="hunt-fine">Last updated: 9 October 2026 (v0.10) · Controller: Equinox Investment Group LLC, 30 N Gould St Ste N, Sheridan, WY 82801, USA · Contact: carlos@equinoxinvestmentgroup.com</p>
      <h2>What the extension does</h2>
      <p>RealHunt Score shows an estimated 0–100 score on homes for sale or rent on any property website, including small agencies. To find them, the extension loads on the websites you open and runs a quick check on your computer (does the page describe homes with prices and bedrooms or sizes?). On any page that is not about homes it stops right there: it reads nothing more, shows nothing and sends nothing. It never runs on mail, search, social networks, banking or similar sites.</p>
      <h2>What we collect, and only after you agree</h2>
      <ul>
        <li><b>Comparable homes on your computer:</b> the price, size, price per m², area and map point of the homes on search pages you open are kept in your browser to compare listings. They leave your browser only after you agree (next point).</li>
        <li><b>Derived listing data:</b> price, currency, size, price per m², rooms, property type, area name, days listed, the score and red-flag labels, the listing URL and a hashed listing ID. We do not collect or store photos or full descriptions from the website.</li>
        <li><b>Your profile, if you answer it:</b> budget, places, type of home, purpose and timeline.</li>
        <li><b>Your account, if you create one:</b> email (checked with a 6-digit code we email you), optionally phone, and whether you want emails from us.</li>
        <li><b>Your 👍 and 👎:</b> after you agree, the homes you like or dislike (their derived numbers, city and link, never your private notes) are linked to your random ID to learn your taste, so scores can tell you how well a home fits you even if you skip the questions.</li>
        <li><b>What you look at:</b> the homes you open (their derived numbers above), the ones you save and share. From them we build your taste profile (price range, areas, size, type) to recommend homes and, only if you ticked the box, to email you homes and price drops that match.</li>
        <li><b>Usage events:</b> install, reports opened, saves, shares and clicks on recommendations, linked to a random ID.</li>
      </ul>
      <p>Before you agree, the score is calculated on your computer only and nothing is sent to us.</p>
      <h2>Location check</h2>
      <p>To count what is within a walk of a home, the extension sends that listing's published map point (never your own location) to the OpenStreetMap Overpass service (overpass-api.de, with overpass.kumi.systems as a backup). If your network blocks it and you have agreed to these terms, our server asks OpenStreetMap instead. Answers are cached for 30 days.</p>
      <p>When a listing shows an address but no map point, and you have agreed to these terms, the extension sends that published address to our server, which looks it up on OpenStreetMap (Nominatim) and keeps the result to avoid asking twice. If you set “my place” (for example your work), that address is looked up the same way once, and the point is kept only in your browser to show distances. To compare the neighbourhood with the city, we use the median prices of homes already in our database.</p>
      <h2>Ranking a whole search</h2>
      <p>If you click “Rank the whole search”, the extension opens the next pages of that same search on that website, from your browser and at about one page every one to two seconds, and reads the same listing numbers as above. It stops when you click Stop, at 500 pages, or if the website asks it to slow down. When the ranking is done it opens the 30 best listings of that search the same way, one at a time, to read each listing in full (description, published map point, year built, bathrooms, plot and similar facts) and score them again; for up to 12 of them it checks what is within a walk as described above. After you agree, the derived numbers of those homes (never photos or descriptions) are sent to us to improve price comparisons, as above.</p>
      <h2>Kept only in your browser</h2>
      <p>Your consent, your random account token and your verified email are also kept in Chrome's own sync storage, so you are not asked again after reinstalling or updating the extension on the same Chrome profile. “Delete my data” clears it too.</p>
      <p>Your private notes and 👍/👎 on homes, the homes you opened recently, your last ranked search and your display choices (for example “hide weak homes”) are stored only in your browser. They are never sent to us, and “Delete my data” erases them too. Map and Street View buttons simply open Google Maps in a new tab with that listing's published map point or area name; Share opens WhatsApp or your email app with a text you can edit before sending.</p>
      <h2>Smart card, shared rankings and comparisons</h2>
      <p>After you agree, the extension asks our server for what we know about the home you open (similar homes nearby, the city's median price per m², the price history and the same home on other sites), using that listing's derived numbers and published map point. If you click “Share” on a ranked search or “Compare”, we store that list (listing links, prices, sizes, rooms, scores and area names, never photos or descriptions) and publish it at a link only people you send it to can find.</p>
      <h2>AI reading of descriptions</h2>
      <p>After you agree, the text of the listing you open is sent to our server and read by an AI model to find red flags and highlights. We keep only the result (labels and short quotes) for 7 days to avoid reading the same listing twice; we never store the full text.</p>
      <h2>Why</h2>
      <p>To calculate and improve scores (comparing a home's price per m² with other homes in the same area), to keep your saved homes and alerts, and to show you homes on RealHunt that match your profile. Recommendations are always labelled “RealHunt pick” or “Sponsored” and never change any score. Legal basis: your consent (GDPR art. 6(1)(a)).</p>
      <h2>What we never do</h2>
      <ul>
        <li>We never sell your data and never use it for credit, lending or unrelated advertising.</li>
        <li>We never read, store or send anything from pages that are not about homes for sale or rent.</li>
        <li>We never republish photos or descriptions from those websites. The public pages on realhunt.co/best show, for homes that score highly, only the facts above (price, size, rooms, city, score, the listing's short headline or address) and a link back to the original listing.</li>
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
