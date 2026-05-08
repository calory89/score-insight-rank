import { Link } from "react-router-dom";

const RHFooter = () => (
  <footer className="border-t border-rh-line bg-rh-navy text-white/60">
    <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-2 md:grid-cols-5 gap-10 text-sm">
      <div className="col-span-2">
        <div className="flex items-center gap-2 font-serif text-xl text-white">
          <span className="text-rh-gold">◆</span> RealHunt
        </div>
        <p className="mt-4 max-w-sm">
          The independent off-plan real estate index. Every project on Earth, scored on the same five public dimensions.
        </p>
        <p className="mt-6 text-xs text-white/40">
          realhunt.co · © {new Date().getFullYear()} RealHunt
        </p>
      </div>
      <div>
        <h4 className="text-white font-semibold mb-3 text-xs tracking-widest uppercase">Index</h4>
        <ul className="space-y-2">
          <li><Link to="/browse" className="hover:text-white">Browse projects</Link></li>
          <li><Link to="/countries" className="hover:text-white">Countries</Link></li>
          <li><Link to="/methodology" className="hover:text-white">Methodology</Link></li>
        </ul>
      </div>
      <div>
        <h4 className="text-white font-semibold mb-3 text-xs tracking-widest uppercase">Agents</h4>
        <ul className="space-y-2">
          <li><Link to="/apply" className="hover:text-white">Apply</Link></li>
          <li><Link to="/login" className="hover:text-white">Sign in</Link></li>
          <li><Link to="/dashboard" className="hover:text-white">Dashboard</Link></li>
        </ul>
      </div>
      <div>
        <h4 className="text-white font-semibold mb-3 text-xs tracking-widest uppercase">Developers</h4>
        <ul className="space-y-2">
          <li><Link to="/for-developers" className="hover:text-white">List a project</Link></li>
          <li><Link to="/homescoring" className="hover:text-white">Legacy scoring tool</Link></li>
        </ul>
      </div>
    </div>
  </footer>
);

export default RHFooter;
