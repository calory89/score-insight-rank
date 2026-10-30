import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import RHNav from "@/components/realhunt/RHNav";
import { COMPANY } from "@/lib/rh";

const UPDATED = "1 October 2026";
const H = ({ c }: { c: string }) => <h2 className="font-display text-[22px] tracking-tight mt-8 mb-2">{c}</h2>;
const P = ({ children }: { children: React.ReactNode }) => <p className="text-[15px] leading-relaxed text-ink mt-3">{children}</p>;
const L = ({ items }: { items: string[] }) => <ul className="list-disc pl-5 mt-2 flex flex-col gap-1 text-[15px] leading-relaxed">{items.map((i) => <li key={i}>{i}</li>)}</ul>;

const Privacy = () => (
  <>
    <P><b>Who we are.</b> RealHunt (realhunt.co) is operated by {COMPANY.name}, {COMPANY.address} ("we", "us"). We are the data controller for the personal data described here. Contact: {COMPANY.email}.</P>
    <H c="1. What we collect" />
    <L items={["Account data: email address, name, and your Google profile picture if you sign in with Google. Optional: phone or WhatsApp number, the country and budget you are interested in.", "Activity on the site: homes you view, save, share or ask about; searches, filters, alerts you set; pages visited, device type, browser, approximate country from your IP address; a random session identifier stored in your browser.", "Messages you send us: requests about a home, developer or seller submissions, and any photos or documents you upload.", "Top 100 rankings: your votes and saves (linked to your account), page views (linked to the random session identifier), questions you send to a developer, and error reports (with your email only if you give it). If you tick the box to make a question public, your first name and your question are shown on that project page once the developer answers. If you write a review, it is public with the first name you choose, and the page shows whether you asked that developer a question through RealHunt.", "Developers and agencies: business contact details that you publish yourself on your website or on property portals (company name, website, work email, phone and WhatsApp), used to build the rankings and to tell you about your pages. If you verify a page: your name, role, phone, company details and the company documents you upload.", "Cookies and similar technologies, described in the Cookie Policy."]} />
    <H c="2. Why we use it and on what legal basis" />
    <L items={["To run the service you asked for: show you homes, keep you signed in, save your favourites, send you the information about a home you requested, answer your requests (performance of a contract, GDPR art. 6(1)(b)).", "To send you homes and alerts that match what you told us you want, and a weekly digest if you subscribed. You can stop at any time with the unsubscribe link in every email or from your account (consent, art. 6(1)(a)).", "To introduce you to a seller, developer or agent when you ask about a home. We then share your name, email, phone if given, and your message with that party only (performance of a contract).", "To understand what works on the site and to advertise RealHunt, using analytics and the Meta Pixel, only if you accepted those cookies (consent). Microsoft Clarity also shows us, without cookies, how pages are used (clicks and scrolling, with form inputs masked) so we can improve them (legitimate interest); it uses cookies only if you accept them.", "To compute the Top 100 rankings from votes, saves, questions and visits, and to stop anyone from inflating them (legitimate interest).", "To contact developers and agencies about their own projects in our rankings, using business contact details they published themselves. Every message says where we found the details and lets you opt out with one reply (legitimate interest, art. 6(1)(f)).", "To check verification requests and show what we verified on the project page (performance of a contract).", "To prevent abuse, secure the service, keep records and comply with law (legitimate interest, art. 6(1)(f), and legal obligation)."]} />
    <H c="3. Who we share it with" />
    <L items={["Service providers that host and run the site and send our emails: Cloudflare and GitHub (hosting), Supabase (database and authentication), Google (sign-in), Mailgun (email delivery). They process data on our instructions.", "The seller, developer, agent or original poster of a home, when you ask us to put you in touch, and Eco Beach City (a project of our own group) when you request information about it.", "The developer of a Top 100 project, when you send a question about it: your name, email, budget, timeframe and question. If the developer has not verified the page yet, RealHunt receives it and passes it on.", "The public, only for what you chose to make public: your first name and question on a project page, next to the developer's answer. Verification documents are never public; only the RealHunt team sees them.", "Meta Platforms, if you accepted advertising cookies, for measurement and advertising.", "Authorities, if the law requires it. We never sell your personal data."]} />
    <H c="4. International transfers" />
    <P>We are a United States company and our providers run servers in the United States and the European Union. Where data leaves the EU or UK we rely on the providers' Standard Contractual Clauses or the EU-US Data Privacy Framework.</P>
    <H c="5. How long we keep it" />
    <P>Account data for as long as you have an account and 12 months after. Requests and leads for 3 years, so we can honour commission agreements and answer disputes. Analytics events for 24 months. Emails logs for 12 months. Verification documents for as long as the page stays verified and 12 months after a request is approved, rejected or withdrawn. Error reports for 24 months. Business contact details of developers and agencies for as long as their project is in a ranking, or until they object. You can ask us to delete earlier.</P>
    <H c="6. Your rights" />
    <P>You can access, correct, download or delete your data, object to or restrict processing, and withdraw consent at any time, by emailing {COMPANY.email} or from your account page. EU and UK residents can complain to their data protection authority. California residents have the rights in the CCPA/CPRA, including to know, delete, correct and opt out of the sale or sharing of personal information; we do not sell personal information, and you can opt out of sharing for advertising by rejecting advertising cookies. We do not discriminate for exercising these rights. Developers and agencies can object at any time to being contacted, or ask us to remove their business contact details, by replying to any of our emails or writing to {COMPANY.email}; we stop within 72 hours.</P>
    <H c="7. Children" />
    <P>The service is for adults. We do not knowingly collect data from anyone under 18. If you think a minor gave us data, write to us and we will delete it.</P>
    <H c="8. Listings from third parties" />
    <P>Most homes on RealHunt are public posts made by third-party accounts (agencies, sellers, curators) on Instagram and other public sites. We show the photo, the price and text they published, link to the original post, and credit the account. If you are the author of a post and want it removed or corrected, use the <Link to="/legal/takedown" className="underline">content removal page</Link>; we act within 72 hours.</P>
    <H c="9. Changes" />
    <P>We will post any change here with a new date. Material changes are announced by email to account holders. Last updated {UPDATED}.</P>
  </>
);

const Terms = () => (
  <>
    <P>These terms govern your use of realhunt.co and related emails (the "Service"), operated by {COMPANY.name}, {COMPANY.address} ("RealHunt"). By using the Service you accept them. If you do not, do not use the Service.</P>
    <H c="1. What RealHunt is, and is not" />
    <P>RealHunt is an information and introduction service. We collect publicly posted homes, present them with our own summaries and estimates, and, when you ask, introduce you to the party selling or marketing a home. <b>RealHunt is not a real estate broker, agent, lawyer, tax adviser or financial adviser in any jurisdiction, does not represent you or any seller, does not hold client money, and is not a party to any purchase.</b> Any transaction is exclusively between you and the seller or their agent, under the laws of the country where the property is.</P>
    <H c="2. No warranty on listings" />
    <P>Listings, prices, sizes, locations, availability, photos, translations, "hooks", price history, cost estimates, maps and buying guides are provided "as is" for orientation only. They come from third-party posts, automated extraction, machine translation and public formulas, and they can be wrong, outdated or already sold. Currency conversions are approximate. Cost estimates are not quotes. Verify everything independently and with a licensed professional in the relevant country before paying anyone anything. To the fullest extent permitted by law we exclude all warranties, express or implied, including accuracy, merchantability, fitness for purpose and non-infringement.</P>
    <H c="3. Your responsibilities" />
    <L items={["You are at least 18 and legally able to contract.", "You provide accurate contact details and do not impersonate anyone.", "You do not scrape, copy, republish or resell the Service or its content, interfere with it, or use it for unlawful purposes.", "If you submit a home or content, you own it or have the right to publish it, it is accurate, it does not infringe anyone's rights, and you grant RealHunt a worldwide, royalty-free licence to display, reproduce, translate, crop and promote it on the Service and in our emails and social channels until you ask us to remove it.", "If we introduce you to a seller or developer, you deal with them at your own risk and you do not circumvent an agreed commission by contracting with them outside the introduction."]} />
    <H c="4. Fees and commissions" />
    <P>Browsing, saving, alerts and asking about a home are free for buyers. RealHunt may receive a referral fee or commission from a seller, developer, agent or from Eco Beach City when a purchase completes after our introduction. Any commission payable by a seller, developer or agency is agreed in writing before any contact is shared. Referral payouts are subject to the licensing rules of each country and may be paid as marketing fees where brokerage licensing applies.</P>
    <H c="5. Affiliated project" />
    <P>Eco Beach City (Sumba, Indonesia) is a project developed by companies related to {COMPANY.name}. When it appears on the Service it is our own project, as explained on our <Link to="/about" className="underline">About page</Link>, and it is never included in any Top 100 ranking. Information about it is provided by that project; the same disclaimers in section 2 apply, and any purchase is governed solely by the contract you sign with the selling entity.</P>
    <H c="6. Top 100 rankings, developer pages and verification" />
    <L items={["The rankings are RealHunt's opinion, computed with the method published at realhunt.co/top/how-we-rank from public listing data and from what users do on the Service. They are not an endorsement of any developer or project and not advice to buy. No payment, commission agreement or relationship with RealHunt changes a project's position. We may improve the method; the published page always shows the current one.", "Votes and saves must be your own: one account per person, no bots, no paid or exchanged votes. We may remove votes, saves or accounts that try to manipulate a ranking.", "A developer may verify a project page for free. By sending a request you confirm you are authorised by the company and that the documents are genuine. Verification confirms that, on the date shown, the company existed and the person who asked was linked to the project. It is not a guarantee about the company, the permits, the construction or any contract, and we may remove a badge if we learn the information was wrong.", "Verified developers are responsible for what they publish on their page, including prices, build dates, notes and answers to buyers, and grant RealHunt the same licence as in section 3 to display it. Answers must be truthful and must not include personal data of the buyer.", "Signed-in users can review a project or developer, good or bad, once per project and based on their own experience. Reviews are shown with the first name chosen by the reviewer and are never removed for being negative; we hide only those with insults, personal data, spam or no real experience behind them. Only the verified developer can reply, publicly, under each review. Reviewers are responsible for what they write and grant RealHunt the licence in section 3 to display it. We link to Google Maps for Google reviews; we do not copy them.", "Anyone can report an error on a project page. We aim to answer within 3 working days and show corrections on the page; this is a service target, not a contractual guarantee.", "The legal checklists are general information about each country, with sources, checked on the date shown. They are not legal advice. The lawyers we list are independent firms with no agreement with RealHunt: we receive nothing if you hire them and we do not vouch for their work.", "A developer who prefers not to appear in a ranking can ask us at " + "hello@realhunt.co" + " and we remove the project within 72 hours."]} />
    <H c="7. Third-party content and intellectual property" />
    <P>Photos, texts and posts belong to their original authors. RealHunt displays short excerpts, thumbnails and links under the principles of fair use, quotation and press review, with attribution and a link to the source, in order to inform the public about publicly offered homes. If you hold rights in content shown here and object, use the <Link to="/legal/takedown" className="underline">content removal process</Link>. RealHunt's own name, logo, design, summaries, rankings, cost models and software are the property of {COMPANY.name}.</P>
    <H c="8. Limitation of liability" />
    <P>To the maximum extent permitted by law, {COMPANY.name}, its members, managers, employees and affiliates are not liable for any indirect, incidental, special, consequential or punitive damages, loss of profit, loss of deposit, or any loss arising from a property transaction, from reliance on any listing, estimate or guide, from the acts of any seller, developer, agent or other user, or from unavailability of the Service. Our total liability for any claim relating to the Service is limited to the greater of USD 100 or the amount you paid us in the 12 months before the claim. Some jurisdictions do not allow certain exclusions; in that case they apply to the extent permitted. Nothing here excludes liability that cannot be excluded by law, including for fraud or death or personal injury caused by negligence.</P>
    <H c="9. Indemnity" />
    <P>You will indemnify {COMPANY.name} against claims, losses and costs (including reasonable legal fees) arising from content you submit, your breach of these terms, or your dealings with any third party you met through the Service.</P>
    <H c="10. Termination" />
    <P>You can delete your account at any time. We can suspend or terminate access for breach of these terms, abuse, or if we discontinue the Service, with notice where reasonable.</P>
    <H c="11. Governing law and disputes" />
    <P>These terms are governed by the laws of the State of Wyoming, USA, without regard to conflict of law rules. Any dispute will be resolved by binding individual arbitration administered by the American Arbitration Association under its Consumer Arbitration Rules, or in the small claims court of Sheridan County, Wyoming, at either party's option. <b>You and RealHunt waive any right to a jury trial and to participate in a class action.</b> Consumers resident in the European Union or United Kingdom keep the protection of the mandatory consumer laws of their country of residence and may bring claims there; the EU online dispute resolution platform is at ec.europa.eu/consumers/odr. If any clause is unenforceable the rest stands.</P>
    <H c="12. Changes and contact" />
    <P>We may update these terms; continued use after the change means acceptance. Contact: {COMPANY.email}, or by post at {COMPANY.address}. Last updated {UPDATED}.</P>
  </>
);

const Cookies = () => (
  <>
    <P>This policy explains the cookies and similar technologies used on realhunt.co by {COMPANY.name}.</P>
    <H c="Essential (always on)" />
    <L items={["Authentication and session cookies from Supabase and Google sign-in, so you stay signed in.", "rh_consent: remembers your cookie choice for 12 months.", "rh_sid: a random identifier so we can count how many people use a feature, count Top 100 page views once per person per day and accept error reports without an account, without knowing who you are. It is not shared with anyone.", "Local storage for small conveniences: last filter, unsent drafts, the referral code that brought you here."]} />
    <H c="Analytics and advertising (only with your consent)" />
    <L items={["Meta Pixel (Facebook/Instagram): measures whether our ads bring visitors and allows us to show RealHunt ads to people who visited. Set by Meta Platforms Ireland Ltd; see facebook.com/policies/cookies. Retention up to 180 days.", "Microsoft Clarity: heatmaps and recordings of how pages are used (clicks, scrolling, taps), with anything typed into forms masked, so we can fix what confuses people. Without your consent it runs without cookies and cannot link one visit to the next; with consent it may set _clck and _clsk (up to 12 months) to do so. Provided by Microsoft Corporation; see privacy.microsoft.com.", "Page-view and event logging in our own database (which page, from where, how long, device type), linked to your account only if you are signed in."]} />
    <H c="Your choices" />
    <P>Choose "Essential only" or "Accept all" in the banner. Change your mind at any time: clear the site data in your browser and the banner appears again, or email {COMPANY.email}. Rejecting non-essential cookies does not limit any feature of the Service. Last updated {UPDATED}.</P>
  </>
);

const Takedown = () => (
  <>
    <P>RealHunt shows publicly posted homes with a credit and a link to the original post. If you are the author, rights holder, the owner of a property, or a person shown in a photo, and you want content removed, corrected or credited differently, we make it easy.</P>
    <H c="How to request removal" />
    <P>Email <a href={`mailto:${COMPANY.email}?subject=Content removal`} className="underline">{COMPANY.email}</a> with: (1) the RealHunt link, (2) what you want (remove, correct, change credit), (3) who you are and your relationship to the content, (4) for copyright claims, a statement that you own the rights or act for the owner and that the information is accurate, with your name and signature. We remove or correct within 72 hours of a valid request, usually the same day, and we tell you when it is done.</P>
    <H c="Copyright (DMCA)" />
    <P>Our designated agent for notices under the Digital Millennium Copyright Act: Copyright Agent, {COMPANY.name}, {COMPANY.address}, {COMPANY.email}. Repeat infringers are removed from the Service. Counter-notices may be sent to the same address.</P>
    <H c="Sellers and agencies" />
    <P>If you post cheap homes and would rather we did not feature yours, tell us once and we exclude your account from all future imports. If you would rather we featured more of them with your details, tell us that too.</P>
    <H c="Developers in a Top 100 ranking" />
    <P>Every project page has a "Report an error" button, and we answer within 3 working days. If you are the developer and want to correct your page, verify it for free and edit it yourself. If you would rather not appear in a ranking at all, email {COMPANY.email} from your company address and we remove the project within 72 hours.</P>
    <H c="Wrong or sold listings" />
    <P>If a home is sold, withdrawn or the price changed, any user can report it from the home's page or by email. We mark it within 24 hours.</P>
  </>
);

const PAGES: Record<string, { title: string; body: () => JSX.Element }> = { privacy: { title: "Privacy Policy", body: Privacy }, terms: { title: "Terms of Service", body: Terms }, cookies: { title: "Cookie Policy", body: Cookies }, takedown: { title: "Content removal and copyright", body: Takedown } };

const Legal = ({ page }: { page?: string }) => {
  const params = useParams();
  const key = page || params.page || "privacy";
  const pg = PAGES[key] || PAGES.privacy;
  useEffect(() => { document.title = `${pg.title} · RealHunt`; window.scrollTo(0, 0); }, [key]);
  return (
    <div className="min-h-screen bg-paper text-ink">
      <RHNav />
      <article className="max-w-[760px] mx-auto px-4 md:px-6 py-10">
        <nav className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-ink-muted mb-6">{Object.entries(PAGES).map(([k, v]) => <Link key={k} to={`/legal/${k}`} className={k === key ? "text-ink font-medium" : "hover:text-ink"}>{v.title}</Link>)}</nav>
        <h1 className="font-display text-[clamp(30px,5vw,44px)] leading-[1.05] tracking-tight">{pg.title}</h1>
        <p className="text-[13px] text-ink-muted mt-2">{COMPANY.name} · {COMPANY.address} · {COMPANY.email}</p>
        <pg.body />
      </article>
    </div>
  );
};
export default Legal;
