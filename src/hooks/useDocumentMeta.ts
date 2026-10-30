import { useEffect } from "react";

const SITE = "https://realhunt.co";

interface DocumentMeta {
  title: string;
  description?: string;
  ogImage?: string;
  canonicalUrl?: string;
  ogType?: string;
  jsonLd?: Record<string, unknown> | null;
}

const setMeta = (selector: string, attr: string, value: string) => {
  const el = document.querySelector(selector);
  if (el) el.setAttribute(attr, value);
};

const useDocumentMeta = ({ title, description, ogImage, canonicalUrl, ogType, jsonLd }: DocumentMeta) => {
  useEffect(() => {
    document.title = title;

    if (description) {
      setMeta('meta[name="description"]', "content", description);
      setMeta('meta[property="og:description"]', "content", description);
      setMeta('meta[name="twitter:description"]', "content", description);
    }

    setMeta('meta[property="og:title"]', "content", title);
    setMeta('meta[name="twitter:title"]', "content", title);

    if (ogImage) {
      setMeta('meta[property="og:image"]', "content", ogImage);
      setMeta('meta[name="twitter:image"]', "content", ogImage);
    }

    // Every route self-references: canonical and og:url always match the page itself.
    const url = canonicalUrl || `${SITE}${window.location.pathname}`;
    setMeta('meta[property="og:url"]', "content", url);
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute("href", url);

    setMeta('meta[property="og:type"]', "content", ogType || "website");

    let script: HTMLScriptElement | null = null;
    if (jsonLd) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.setAttribute("data-route-jsonld", "true");
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }

    return () => {
      if (script) script.remove();
      if (ogType && ogType !== "website") setMeta('meta[property="og:type"]', "content", "website");
    };
  }, [title, description, ogImage, canonicalUrl, ogType, JSON.stringify(jsonLd ?? null)]);
};

export default useDocumentMeta;
