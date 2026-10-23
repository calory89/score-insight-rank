// /method: how the 70–98 home score works. The prerendered copy in seo/prerender.ts says the same thing for
// crawlers and share previews; keep the two in step. (The old listing-analysis method moved to /method/analysis.)
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { BarChart3 } from "lucide-react";
import { DIMS } from "./dims";
import { t } from "./i18n";

const TITLE = "How the RealHunt score works: 11 sub-scores, graded 70 to 98 · RealHunt";
const DESC = "Every home is checked by a person, then graded from 70 to 98 against every other home on RealHunt using 11 sub-scores: price, price per m², space, condition, extras, water, weather, airport, buying costs, listing detail and buyer interest.";

export function HomeMethodPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = TITLE;
    const set = (sel: string, attr: string, val: string) => document.querySelector(sel)?.setAttribute(attr, val);
    set('meta[name="description"]', "content", DESC);
    set('link[rel="canonical"]', "href", "https://realhunt.co/method");
    set('meta[property="og:title"]', "content", TITLE);
    set('meta[property="og:description"]', "content", DESC);
    set('meta[property="og:url"]', "content", "https://realhunt.co/method");
  }, []);
  return (
    <div className="hunt-wrap hunt-page tp">
      <span className="hunt-eyebrow"><BarChart3 size={13} /> {t("HOW THE SCORE WORKS")}</span>
      <h1>{t("How the RealHunt score works")}</h1>
      <p>{t("A person looks at every home before it goes up. Homes that need major work, ruins, bare land and listings with one photo are turned down. That is why the grade starts at 70: a home on RealHunt has already passed.")}</p>
      <p>{t("The grade then compares the home with every other home on the site, from 70 to 98. The home pages, the country pages and the front page are all ordered by this grade, best first. Votes and saves only move the buyer-interest sub-score; nobody pays to rank higher.")}</p>
      <h2>{t("The 11 sub-scores (0 to 100)")}</h2>
      <ul className="tp-law">
        {DIMS.map(([k, label, help]) => <li key={k}><b>{t(label)}</b>: {t(help)}</li>)}
      </ul>
      <h2>{t("How to read a grade")}</h2>
      <ul className="tp-law">
        <li><b>90–98</b>: {t("top of the site. Usually cheap for its size, ready to live in and well placed.")}</li>
        <li><b>80–89</b>: {t("very good. Strong on most sub-scores, with one or two weak spots you can see on the home page.")}</li>
        <li><b>70–79</b>: {t("good. It passed the hand check, but the sub-scores show what you give up.")}</li>
      </ul>
      <h2>{t("What the score is not")}</h2>
      <p>{t("It is not a survey or a valuation. Photos can flatter and listings go out of date. Before you buy anything, get an independent inspection and a local lawyer or notary. If a home is sold or wrong, use the report button on its page.")}</p>
      <p><Link className="hunt-primary" to="/">{t("See the best homes")}</Link> <Link className="hunt-secondary" to="/blog/how-we-choose-homes">{t("Why we say no to most cheap houses")}</Link></p>
      <p className="hunt-fine"><Link className="hunt-link" to="/top/how-we-rank">{t("New builds use a different ranking: how the Top 100 works")}</Link> · <Link className="hunt-link" to="/about">{t("Who runs RealHunt")}</Link></p>
    </div>
  );
}
