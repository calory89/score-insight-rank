import { Mail, ExternalLink } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t border-border py-14 bg-card">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <img src="/images/logo.png" alt="RealHunt" className="h-7 w-7 rounded-md object-cover" />
              <span className="text-sm font-bold text-foreground">RealHunt</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              AI-powered property analysis for smarter real estate investments worldwide.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-4">Product</h4>
            <ul className="space-y-2.5 text-xs text-muted-foreground">
              <li><a href="/rankings" className="hover:text-foreground transition-colors">Rankings</a></li>
              <li><a href="/discover" className="hover:text-foreground transition-colors">Discover</a></li>
              <li><a href="/#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
              <li><a href="/#methodology" className="hover:text-foreground transition-colors">Methodology</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-4">Company</h4>
            <ul className="space-y-2.5 text-xs text-muted-foreground">
              <li><a href="/#faq" className="hover:text-foreground transition-colors">FAQ</a></li>
              <li>
                <a href="mailto:hello@realhunt.com" className="hover:text-foreground transition-colors flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-4">Legal</h4>
            <ul className="space-y-2.5 text-xs text-muted-foreground">
              <li><a href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
              <li><a href="/terms" className="hover:text-foreground transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} RealHunt. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://twitter.com/realhunt"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              𝕏 Twitter <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://linkedin.com/company/realhunt"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              LinkedIn <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
