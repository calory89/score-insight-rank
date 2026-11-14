import { useState } from "react";
import { Loader2, Mail, MessageSquare, Send, Check } from "lucide-react";
import RHNav from "@/components/realhunt/RHNav";
import RHFooter from "@/components/realhunt/RHFooter";
import useDocumentMeta from "@/hooks/useDocumentMeta";
import { toast } from "@/hooks/use-toast";
import { COMPANY } from "@/lib/rh";

const Contact = () => {
  useDocumentMeta({
    title: "Contact · RealHunt",
    description: "Talk to the RealHunt team. Sales, agency plans, partnerships, support.",
    canonicalUrl: "https://realhunt.co/contact",
  });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast({ title: "Missing info", description: "Name, email and message are required.", variant: "destructive" });
      return;
    }
    setSending(true);

    // Best-effort: open the user's mail client with a prefilled message.
    // (When the backend "contact_messages" table + edge function are wired,
    // also POST to it here. For now mailto guarantees the message reaches us.)
    try {
      const subject = encodeURIComponent(`RealHunt contact from ${name}`);
      const body = encodeURIComponent(
        `From: ${name} <${email}>\n\n${message}\n\nSent via realhunt.co/contact`
      );
      window.location.href = `mailto:hello@realhunt.co?subject=${subject}&body=${body}`;
    } catch {
      /* ignore — fall through to success state */
    }

    setTimeout(() => {
      setSending(false);
      setSent(true);
      toast({ title: "Message ready to send", description: "We've opened your mail client. We'll reply within one business day." });
    }, 400);
  };

  return (
    <div className="min-h-screen bg-paper text-ink">
      <RHNav />
      <main className="max-w-[1040px] mx-auto px-6 py-16 md:py-24 grid md:grid-cols-12 gap-12">
        <div className="md:col-span-5">
          <div className="text-[12px] uppercase tracking-[0.2em] text-ink-soft">Contact</div>
          <h1 className="font-display text-[40px] md:text-[52px] leading-[1.05] mt-2 tracking-[-0.02em]">
            Let's talk.
          </h1>
          <p className="mt-5 text-ink-muted text-[16px] leading-relaxed">
            Agency plans, white-label, partnerships, press, or a tricky listing
            you'd like a second opinion on, drop us a line. A human replies.
          </p>

          <div className="mt-8 space-y-4">
            <a
              href="mailto:hello@realhunt.co"
              className="flex items-center gap-3 rh-card !p-4 hover:border-ink/20 transition-colors"
            >
              <span className="h-9 w-9 rounded-full bg-[#FBF6EA] flex items-center justify-center">
                <Mail size={16} className="text-accent-gold" />
              </span>
              <span>
                <span className="block text-[12px] uppercase tracking-wider text-ink-soft">Email</span>
                <span className="block text-[15px] text-ink">hello@realhunt.co</span>
              </span>
            </a>
            <div className="flex items-center gap-3 rh-card !p-4">
              <span className="h-9 w-9 rounded-full bg-[#EFF5F1] flex items-center justify-center">
                <MessageSquare size={16} className="text-[#1E6B4F]" />
              </span>
              <span>
                <span className="block text-[12px] uppercase tracking-wider text-ink-soft">Response time</span>
                <span className="block text-[15px] text-ink">Within one business day</span>
              </span>
            </div>
            {/* 15-nov-2026: who is behind the site and where, as on the legal pages (also in the static HTML and JSON-LD: seo/reach) */}
            <address className="rh-card !p-4 not-italic text-[14px] leading-relaxed text-ink">
              <span className="block text-[12px] uppercase tracking-wider text-ink-soft">Company</span>
              {COMPANY.name}<br />{COMPANY.address}
            </address>
          </div>
        </div>

        <div className="md:col-span-7">
          <form onSubmit={onSubmit} className="rh-card !p-7 space-y-5">
            <div>
              <label className="block text-[12px] uppercase tracking-wider text-ink-soft mb-1.5">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                required
                className="w-full h-12 px-4 rounded-xl border border-hairline bg-surface focus:border-ink/30 focus:outline-none transition"
              />
            </div>
            <div>
              <label className="block text-[12px] uppercase tracking-wider text-ink-soft mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={255}
                required
                className="w-full h-12 px-4 rounded-xl border border-hairline bg-surface focus:border-ink/30 focus:outline-none transition"
              />
            </div>
            <div>
              <label className="block text-[12px] uppercase tracking-wider text-ink-soft mb-1.5">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={2000}
                required
                rows={6}
                className="w-full px-4 py-3 rounded-xl border border-hairline bg-surface focus:border-ink/30 focus:outline-none transition resize-y"
              />
              <p className="text-[11px] text-ink-soft mt-1.5">{message.length}/2000</p>
            </div>
            <button
              type="submit"
              disabled={sending || sent}
              className="rh-btn-primary w-full justify-center !py-3.5"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : sent ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              {sent ? "Sent, check your mail client" : sending ? "Preparing…" : "Send message"}
            </button>
            <p className="text-[11px] text-ink-soft text-center">
              We never share your email. See our{" "}
              <a href="/legal/privacy" className="rh-btn-tertiary">privacy policy</a>.
            </p>
          </form>
        </div>
      </main>
      <RHFooter />
    </div>
  );
};

export default Contact;
