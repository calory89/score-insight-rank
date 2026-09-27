import { useEffect } from "react";

const SITE = "https://realhunt.co";

interface DocumentMeta {
  title: string;
  description?: string;
  ogImage?: string;
  canonicalUrl?: string;
  ogType?: string;
  robots?: "index, follow" | "noindex, nofollow";
  jsonLd?: Record<string, unknown> | Record<string, unknown>[] | null;
}

const setMeta = (selector: string, attr: string, value: string) => {
  const el = document.querySelector(selector);
  if (el) el.setAttribute(attr, value);
};

const useDocumentMeta = ({ title, description, ogImage, canonicalUrl, ogType, robots = "index, follow", jsonLd }: DocumentMeta) => {
  const json = JSON.stringify(jsonLd ?? null);

  useEffect(() => {
    const previous = {
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.getAttribute("content"),
      ogDescription: document.querySelector('meta[property="og:description"]')?.getAttribute("content"),
      twitterDescription: document.querySelector('meta[name="twitter:description"]')?.getAttribute("content"),
      ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute("content"),
      twitterTitle: document.querySelector('meta[name="twitter:title"]')?.getAttribute("content"),
      robots: document.querySelector('meta[name="robots"]')?.getAttribute("content"),
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href"),
      ogUrl: document.querySelector('meta[property="og:url"]')?.getAttribute("content"),
      ogType: document.querySelector('meta[property="og:type"]')?.getAttribute("content"),
      ogImage: document.querySelector('meta[property="og:image"]')?.getAttribute("content"),
      twitterImage: document.querySelector('meta[name="twitter:image"]')?.getAttribute("content"),
    };
    document.title = title;

    if (description) {
      setMeta('meta[name="description"]', "content", description);
      setMeta('meta[property="og:description"]', "content", description);
      setMeta('meta[name="twitter:description"]', "content", description);
    }

    setMeta('meta[property="og:title"]', "content", title);
    setMeta('meta[name="twitter:title"]', "content", title);
    setMeta('meta[name="robots"]', "content", robots);

    if (ogImage) {
      setMeta('meta[property="og:image"]', "content", ogImage);
      setMeta('meta[name="twitter:image"]', "content", ogImage);
    }

    const url = canonicalUrl || `${SITE}${window.location.pathname}`;
    setMeta('meta[property="og:url"]', "content", url);
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute("href", url);
    setMeta('meta[property="og:type"]', "content", ogType || "website");

    document.querySelectorAll('script[data-route-jsonld="true"]').forEach((node) => node.remove());
    const scripts = (jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : []).map((item) => {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.setAttribute("data-route-jsonld", "true");
      script.textContent = JSON.stringify(item);
      document.head.appendChild(script);
      return script;
    });

    return () => {
      scripts.forEach((script) => script.remove());
      document.title = previous.title;
      const restore = (selector: string, value: string | null | undefined) => {
        if (value != null) setMeta(selector, "content", value);
      };
      restore('meta[name="description"]', previous.description);
      restore('meta[property="og:description"]', previous.ogDescription);
      restore('meta[name="twitter:description"]', previous.twitterDescription);
      restore('meta[property="og:title"]', previous.ogTitle);
      restore('meta[name="twitter:title"]', previous.twitterTitle);
      restore('meta[name="robots"]', previous.robots);
      restore('meta[property="og:url"]', previous.ogUrl);
      restore('meta[property="og:type"]', previous.ogType);
      restore('meta[property="og:image"]', previous.ogImage);
      restore('meta[name="twitter:image"]', previous.twitterImage);
      const link = document.querySelector('link[rel="canonical"]');
      if (link && previous.canonical) link.setAttribute("href", previous.canonical);
    };
  }, [title, description, ogImage, canonicalUrl, ogType, robots, json]);

  return null;
};

export default useDocumentMeta;
