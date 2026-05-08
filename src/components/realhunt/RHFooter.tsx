import { Link } from "react-router-dom";

const RHFooter = () => (
  <footer className="border-t border-slate-200 bg-slate-50 text-slate-600">
    <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-2 md:grid-cols-5 gap-10 text-sm">
      <div className="col-span-2">
        <div className="flex items-center gap-2 font-serif text-xl text-slate-900">
          <span className="text-amber-600">◆</span> RealHunt
        </div>
        <p className="mt-4 max-w-sm text-slate-600">
          The independent off-plan real estate index. Every project on Earth, scored on the same five public dimensions.
        </p>
        <p className="mt-6 text-xs text-slate-400">
          realhunt.co · © {new Date().getFullYear()} RealHunt
        </p>
      </div>
      <div>
        <h4 className="text-slate-900 font-semibold mb-3 text-xs tracking-widest uppercase">Index</h4>
        <ul className="space-y-2">
          <li><Link to="/" className="hover:text-slate-900">Browse projects</Link></li>
          <li><Link to="/methodology" className="hover:text-slate-900">Methodology</Link></li>
          <li><Link to="/homescoring" className="hover:text-slate-900">Home Score (individual)</Link></li>
        </ul>
      </div>
      <div>
        <h4 className="text-slate-900 font-semibold mb-3 text-xs tracking-widest uppercase">Agents</h4>
        <ul className="space-y-2">
          <li><Link to="/apply" className="hover:text-slate-900">Apply / Sign in</Link></li>
          <li><Link to="/dashboard" className="hover:text-slate-900">Dashboard</Link></li>
        </ul>
      </div>
      <div>
        <h4 className="text-slate-900 font-semibold mb-3 text-xs tracking-widest uppercase">Developers</h4>
        <ul className="space-y-2">
          <li><Link to="/for-developers" className="hover:text-slate-900">List a project</Link></li>
        </ul>
      </div>
    </div>
  </footer>
);

export default RHFooter;
