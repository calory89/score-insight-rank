import { useEffect } from "react";
import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "How accurate are RealHunt scores?",
    a: "Our AI analyzes 40+ data points per property — market trends, comparable sales, rental yields, demand indicators, and risk factors. Scores are updated in real-time and validated against actual market outcomes. Our methodology has a 92% correlation with real market performance over 12 months.",
  },
  {
    q: "Which property platforms do you support?",
    a: "RealHunt works with any property listing URL — Idealista, Immobilienscout24, Rightmove, Zillow, Funda, SeLoger, Immoweb, and hundreds more. If it has a URL, we can analyze it.",
  },
  {
    q: "Is my data safe and private?",
    a: "Absolutely. Your analyses are private by default — only you can see them. We use bank-grade encryption (AES-256) and never share or sell your data. You can delete your account and all associated data at any time.",
  },
  {
    q: "Can I cancel my subscription anytime?",
    a: "Yes, no questions asked. Cancel with one click from your Settings page. You'll keep access until the end of your billing period. No hidden fees, no lock-in contracts.",
  },
  {
    q: "How is RealHunt different from a real estate agent?",
    a: "Agents earn commissions on sales — their incentive is for you to buy, not to buy smart. RealHunt is 100% independent with zero conflict of interest. We score properties objectively so you can make data-driven decisions.",
  },
  {
    q: "What does the Global Score mean?",
    a: "The Global Score (0-100) is a composite of 6 dimensions: ROI Potential, Market Stability, Demand Strength, Safety Score, Liquidity Outlook, and overall value. A score above 75 indicates a strong investment opportunity. Above 85 is exceptional.",
  },
  {
    q: "Can I compare properties from different countries?",
    a: "Yes! That's one of RealHunt's superpowers. Our scoring system normalizes data across markets, so you can directly compare a villa in Bali with an apartment in Berlin and see which is the better investment.",
  },
];

const FAQ = () => {
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "faq-schema";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.a,
        },
      })),
    });
    document.head.appendChild(script);
    return () => {
      document.getElementById("faq-schema")?.remove();
    };
  }, []);

  return (
    <section id="faq" className="py-20 bg-background">
      <div className="container mx-auto px-4 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="text-xs font-semibold tracking-widest uppercase text-primary mb-3 block">
            Got Questions?
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground">
            Everything you need to know before you start hunting.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={`faq-${i}`}
                value={`faq-${i}`}
                className="border border-border rounded-xl px-5 bg-card data-[state=open]:shadow-sm transition-shadow"
              >
                <AccordionTrigger className="text-left text-sm font-medium text-foreground hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-center mt-10"
        >
          <p className="text-sm text-muted-foreground">
            Still have questions?{" "}
            <a href="mailto:hello@realhunt.com" className="text-primary hover:underline font-medium">
              Contact us
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQ;
