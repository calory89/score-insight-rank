// "On this page" for long guides (15-nov-2026): a closed line that opens into the list of the page's sections.
// It reads the headings that are on screen, so it follows the page's language and needs no list kept by hand.
import { useRef, useState } from "react";
import { List } from "lucide-react";
import { t } from "../i18n";
import "./n9.css";

const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

export default function Toc({ within }: { within: string }) {
  const [items, setItems] = useState<[string, string][]>([]);
  const box = useRef<HTMLDetailsElement>(null);
  const read = () => {
    const root = box.current?.closest(within) || document.querySelector(within);
    if (!root) return;
    const used = new Set<string>();
    setItems([...root.querySelectorAll("h2")].filter((h) => !h.closest(".n9-toc, .n9-checked") && (h.textContent || "").trim()).map((h) => {
      let id = h.id || "s-" + slug(h.textContent || "");
      while (used.has(id)) id += "-2";
      used.add(id); h.id = id;
      return [id, (h.textContent || "").trim()] as [string, string];
    }));
  };
  return (
    <details className="n9-toc" ref={box} onToggle={(e) => { if ((e.currentTarget as HTMLDetailsElement).open) read(); }}>
      <summary><List size={16} aria-hidden="true" /> {t("On this page")}</summary>
      <ol>{items.map(([id, label]) => <li key={id}><a href={"#" + id} onClick={(e) => { const el = document.getElementById(id); if (el) { e.preventDefault(); el.scrollIntoView({ behavior: "smooth", block: "start" }); history.replaceState(null, "", "#" + id); } }}>{label}</a></li>)}</ol>
    </details>
  );
}
