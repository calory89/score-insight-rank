import { Link } from "react-router-dom";
import { ShieldCheck, FileSearch } from "lucide-react";

const RHFooter = () => (
  <footer className="border-t border-hairline bg-paper">
    <div className="max-w-[1140px] mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-hairline bg-surface text-[12px] text-ink-muted">
          <FileSearch size={13} className="text-[#B8893B]" />
          No black box — every number sourced
        </span>
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-hairline bg-surface text-[12px] text-ink-muted">
          <ShieldCheck size={13} className="text-[#1E6B4F]" />
          GDPR-friendly — we never sell your data
        </span>
      </div>
      <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 md:justify-end text-[13px] text-ink-soft">
        <Link to="/method" className="hover:text-ink transition-colors">Method</Link>
        <Link to="/pricing" className="hover:text-ink transition-colors">Pricing</Link>
        <Link to="/for-agents" className="hover:text-ink transition-colors">For Agents</Link>
        <Link to="/legal/terms" className="hover:text-ink transition-colors">Terms</Link>
        <Link to="/legal/privacy" className="hover:text-ink transition-colors">Privacy</Link>
        <a href="mailto:hello@realhunt.co" className="hover:text-ink transition-colors">Contact</a>
      </nav>
    </div>
    <div className="border-t border-hairline">
      <div className="max-w-[1140px] mx-auto px-6 py-6 flex items-center justify-between text-[12px] text-ink-soft">
        <div className="flex items-center gap-3">
          <span className="font-display text-[16px] text-ink leading-none">RealHunt</span>
          <span>·</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
        <span>Made with rigor in 🇪🇸 · realhunt.co</span>
      </div>
    </div>
  </footer>
);

export default RHFooter;
