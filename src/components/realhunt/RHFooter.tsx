import { Link } from "react-router-dom";

const RHFooter = () => (
  <footer className="border-t border-hairline bg-paper">
    <div className="max-w-[1140px] mx-auto px-6 py-12 flex flex-col md:flex-row md:items-center md:justify-between gap-6 text-[13px] text-ink-soft">
      <div className="flex items-center gap-3">
        <span className="font-display text-[18px] text-ink leading-none">RealHunt</span>
        <span className="text-ink-soft">·</span>
        <span>© {new Date().getFullYear()}</span>
      </div>
      <nav className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <Link to="/method" className="hover:text-ink transition-colors">Method</Link>
        <Link to="/pricing" className="hover:text-ink transition-colors">Pricing</Link>
        <Link to="/api" className="hover:text-ink transition-colors">API</Link>
        <Link to="/legal/terms" className="hover:text-ink transition-colors">Terms</Link>
        <Link to="/legal/privacy" className="hover:text-ink transition-colors">Privacy</Link>
        <a href="mailto:hello@realhunt.co" className="hover:text-ink transition-colors">Contact</a>
      </nav>
    </div>
  </footer>
);

export default RHFooter;
