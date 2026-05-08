import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import RHNav from "@/components/realhunt/RHNav";
import RHFooter from "@/components/realhunt/RHFooter";
import LoginGateModal from "@/components/LoginGateModal";
import useDocumentMeta from "@/hooks/useDocumentMeta";
import { useAuth } from "@/contexts/AuthContext";
import { Check } from "lucide-react";

const Apply = () => {
  useDocumentMeta({
    title: "Apply as Agent — RealHunt",
    description: "Free forever for verified off-plan agents. Sign in with Google or email.",
  });
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <RHNav />
      <section className="max-w-5xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-14 items-start">
        <div>
          <p className="text-[11px] tracking-[0.25em] uppercase text-amber-600 font-semibold mb-4">
            For agents
          </p>
          <h1 className="font-serif text-4xl md:text-5xl leading-tight">
            Free forever. <span className="italic text-amber-600">Independent.</span>
          </h1>
          <p className="text-slate-600 mt-5 text-lg leading-relaxed">
            Sign in to access full project dossiers, save favorites, contact developers and reserve allocation slots.
          </p>
          <ul className="space-y-3 mt-8 text-slate-700">
            {[
              "Unlimited dossier downloads",
              "Save favorite projects",
              "Direct line to developers",
              "Live commission terms",
              "Pipeline manager",
            ].map((b) => (
              <li key={b} className="flex items-start gap-2">
                <Check className="h-5 w-5 text-emerald-600 mt-0.5" /> <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 min-h-[300px] flex items-center justify-center">
          <button
            onClick={() => setOpen(true)}
            className="px-6 py-3 rounded-md bg-slate-900 text-white font-semibold hover:bg-slate-800"
          >
            Sign in / Create account
          </button>
        </div>
      </section>
      <RHFooter />
      <LoginGateModal open={open} onClose={() => setOpen(false)} onSuccess={() => navigate("/dashboard")} />
    </div>
  );
};

export default Apply;
